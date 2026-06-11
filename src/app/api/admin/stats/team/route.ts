import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface TeamDistribution {
  champion: number;
  runnerUp: number;
  thirdPlace: number;
  fourthPlace: number;
  quarters: number;
  round16: number;
  round32: number;
  groups: number;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId é obrigatório" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Seleção não encontrada" }, { status: 404 });
  }

  // Only consider users who actually completed their bracket prediction.
  // A finished bracket always produces a ChampionPrediction, so its presence is
  // our "deu palpite" marker — users who left it blank / haven't filled it yet
  // are excluded so they don't inflate the "Fase de grupos" bucket.
  const champPreds = await prisma.championPrediction.findMany({
    where: { user: { role: "user" } },
    select: { userId: true, championTeamId: true, runnerUpTeamId: true, thirdPlaceTeamId: true },
  });
  const champMap = new Map(champPreds.map((c) => [c.userId, c]));
  const eligibleUserIds = champPreds.map((c) => c.userId);
  const total = eligibleUserIds.length;

  // Phase predictions for this team (only from eligible users)
  const phasePreds = await prisma.phasePrediction.findMany({
    where: { teamId, userId: { in: eligibleUserIds } },
    select: { userId: true, phase: true },
  });
  const userPhases = new Map<string, Set<string>>();
  for (const p of phasePreds) {
    if (!userPhases.has(p.userId)) userPhases.set(p.userId, new Set());
    userPhases.get(p.userId)!.add(p.phase);
  }

  const dist: TeamDistribution = {
    champion: 0,
    runnerUp: 0,
    thirdPlace: 0,
    fourthPlace: 0,
    quarters: 0,
    round16: 0,
    round32: 0,
    groups: 0,
  };

  for (const uid of eligibleUserIds) {
    const champ = champMap.get(uid);
    const phases = userPhases.get(uid) ?? new Set<string>();

    if (champ?.championTeamId === teamId) {
      dist.champion++;
    } else if (champ?.runnerUpTeamId === teamId) {
      dist.runnerUp++;
    } else if (champ?.thirdPlaceTeamId === teamId) {
      dist.thirdPlace++;
    } else if (phases.has("SEMIS") || phases.has("FINAL")) {
      // Reached semis/final but not in top 3 → 4th place
      dist.fourthPlace++;
    } else if (phases.has("QUARTERS")) {
      dist.quarters++;
    } else if (phases.has("ROUND_16")) {
      dist.round16++;
    } else if (phases.has("ROUND_32")) {
      dist.round32++;
    } else {
      dist.groups++;
    }
  }

  return NextResponse.json({ team: { id: team.id, name: team.name }, total, distribution: dist });
}
