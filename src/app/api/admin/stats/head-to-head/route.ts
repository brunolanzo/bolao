import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export interface H2HParticipant {
  id: string;
  name: string;
  position: number;
  totalPoints: number;
  totalMatchPts: number;
  totalPhasePts: number;
  totalChampPts: number;
  exactScores: number;
  finishedMatches: number;
  correctOutcomes: number;
  championPick: string | null;
  runnerUpPick: string | null;
  thirdPlacePick: string | null;
}

export interface HeadToHead {
  totalParticipants: number;
  a: H2HParticipant;
  b: H2HParticipant;
  /** Finished matches BOTH participants predicted — the true "duels". */
  comparedMatches: number;
  aWins: number;
  bWins: number;
  draws: number;
}

const champInclude = {
  champion: { select: { name: true } },
  runnerUp: { select: { name: true } },
  thirdPlace: { select: { name: true } },
} as const;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const aId = searchParams.get("a");
  const bId = searchParams.get("b");
  if (!aId || !bId) {
    return NextResponse.json({ error: "Informe dois participantes (a e b)" }, { status: 400 });
  }
  if (aId === bId) {
    return NextResponse.json({ error: "Escolha dois participantes diferentes" }, { status: 400 });
  }

  // Read-only: ranking comes from already-persisted points; the finished-match
  // query just compares the two participants' stored predictions. Nothing is
  // written — no scores, points or bets are touched.
  const [ranking, finishedMatches, champA, champB] = await Promise.all([
    computeRanking(),
    prisma.match.findMany({
      where: {
        status: "FINISHED",
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: {
        id: true,
        predictions: {
          where: { userId: { in: [aId, bId] } },
          select: { userId: true, points: true },
        },
      },
    }),
    prisma.championPrediction.findUnique({ where: { userId: aId }, include: champInclude }),
    prisma.championPrediction.findUnique({ where: { userId: bId }, include: champInclude }),
  ]);

  const aIdx = ranking.findIndex((r) => r.id === aId);
  const bIdx = ranking.findIndex((r) => r.id === bId);
  if (aIdx === -1 || bIdx === -1) {
    return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
  }

  // Per-user accuracy + head-to-head tally, all from the single finished-match
  // query above (one pass).
  let aFinished = 0, aCorrect = 0, aExact = 0;
  let bFinished = 0, bCorrect = 0, bExact = 0;
  let aWins = 0, bWins = 0, draws = 0, comparedMatches = 0;

  for (const m of finishedMatches) {
    const ap = m.predictions.find((p) => p.userId === aId);
    const bp = m.predictions.find((p) => p.userId === bId);

    if (ap && ap.points !== null) {
      aFinished++;
      if (ap.points >= 3) aCorrect++;
      if (ap.points === 7) aExact++;
    }
    if (bp && bp.points !== null) {
      bFinished++;
      if (bp.points >= 3) bCorrect++;
      if (bp.points === 7) bExact++;
    }

    // Only matches BOTH predicted count as a head-to-head duel.
    if (ap && ap.points !== null && bp && bp.points !== null) {
      comparedMatches++;
      if (ap.points > bp.points) aWins++;
      else if (bp.points > ap.points) bWins++;
      else draws++;
    }
  }

  const ea = ranking[aIdx];
  const eb = ranking[bIdx];

  const a: H2HParticipant = {
    id: ea.id,
    name: ea.name,
    position: aIdx + 1,
    totalPoints: ea.totalPoints,
    totalMatchPts: ea.totalMatchPts,
    totalPhasePts: ea.totalPhasePts,
    totalChampPts: ea.totalChampPts,
    exactScores: aExact,
    finishedMatches: aFinished,
    correctOutcomes: aCorrect,
    championPick: champA?.champion?.name ?? null,
    runnerUpPick: champA?.runnerUp?.name ?? null,
    thirdPlacePick: champA?.thirdPlace?.name ?? null,
  };

  const b: H2HParticipant = {
    id: eb.id,
    name: eb.name,
    position: bIdx + 1,
    totalPoints: eb.totalPoints,
    totalMatchPts: eb.totalMatchPts,
    totalPhasePts: eb.totalPhasePts,
    totalChampPts: eb.totalChampPts,
    exactScores: bExact,
    finishedMatches: bFinished,
    correctOutcomes: bCorrect,
    championPick: champB?.champion?.name ?? null,
    runnerUpPick: champB?.runnerUp?.name ?? null,
    thirdPlacePick: champB?.thirdPlace?.name ?? null,
  };

  const result: HeadToHead = {
    totalParticipants: ranking.length,
    a,
    b,
    comparedMatches,
    aWins,
    bWins,
    draws,
  };

  return NextResponse.json(result);
}
