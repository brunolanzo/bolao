import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

const PHASE_LABEL: Record<string, string> = {
  GROUP: "Grupos",
  ROUND_32: "2ª Fase",
  ROUND_16: "Oitavas",
  QUARTERS: "Quartas",
  SEMIS: "Semis",
  THIRD_PLACE: "3º Lugar",
  FINAL: "Final",
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
  }

  const [ranking, predictions, champion] = await Promise.all([
    computeRanking(),
    prisma.matchPrediction.findMany({
      where: { userId },
      include: {
        match: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      orderBy: { match: { matchOrder: "asc" } },
    }),
    prisma.championPrediction.findUnique({
      where: { userId },
      include: {
        champion: { select: { name: true } },
        runnerUp: { select: { name: true } },
        thirdPlace: { select: { name: true } },
      },
    }),
  ]);

  const rankIdx = ranking.findIndex((r) => r.id === userId);
  if (rankIdx === -1) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const entry = ranking[rankIdx];
  const position = rankIdx + 1;
  const totalParticipants = ranking.length;

  const finishedPreds = predictions.filter(
    (p) => p.match.status === "FINISHED" && p.points !== null
  );
  const finishedMatches = finishedPreds.length;
  const correctOutcomes = finishedPreds.filter((p) => (p.points ?? 0) >= 3).length;
  const exactScores = finishedPreds.filter((p) => p.points === 7).length;

  const matchResults = finishedPreds.map((p) => {
    const phase = PHASE_LABEL[p.match.phase] ?? p.match.phase;
    const group = p.match.groupLabel ? ` ${p.match.groupLabel}` : "";
    return {
      matchLabel: `[${phase}${group}] ${p.match.homeTeam?.name} × ${p.match.awayTeam?.name}`,
      predicted: `${p.homeScore} x ${p.awayScore}`,
      actual: `${p.match.homeScore} x ${p.match.awayScore}`,
      points: p.points ?? 0,
    };
  });

  return NextResponse.json({
    name: entry.name,
    rankingPosition: position,
    totalParticipants,
    totalPoints: entry.totalPoints,
    totalMatchPts: entry.totalMatchPts,
    totalPhasePts: entry.totalPhasePts,
    totalChampPts: entry.totalChampPts,
    exactScores,
    finishedMatches,
    correctOutcomes,
    championPick: champion?.champion?.name ?? null,
    runnerUpPick: champion?.runnerUp?.name ?? null,
    thirdPlacePick: champion?.thirdPlace?.name ?? null,
    matchResults,
  });
}
