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

  const users = await prisma.user.findMany({
    where: { role: "user" },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  const total = userIds.length;

  // Champion predictions (champion / vice / 3rd)
  const champPreds = await prisma.championPrediction.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, championTeamId: true, runnerUpTeamId: true, thirdPlaceTeamId: true },
  });
  const champMap = new Map(champPreds.map((c) => [c.userId, c]));

  // Phase predictions for this team
  const phasePreds = await prisma.phasePrediction.findMany({
    where: { teamId, userId: { in: userIds } },
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

  for (const uid of userIds) {
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
