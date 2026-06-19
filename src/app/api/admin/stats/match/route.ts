import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRanking } from "@/lib/ranking";

/**
 * GET /api/admin/stats/match?matchId=<id>
 *
 * Live betting breakdown for a single match:
 *   - distribution of predicted outcomes (home win / draw / away win)
 *   - most-predicted scorelines
 *   - if the match is FINISHED: how many users nailed the exact score
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId é obrigatório" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  const preds = await prisma.matchPrediction.findMany({
    where: { matchId },
    select: { homeScore: true, awayScore: true },
  });

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  const scoreFreq = new Map<string, number>();

  for (const p of preds) {
    if (p.homeScore > p.awayScore) homeWin++;
    else if (p.homeScore < p.awayScore) awayWin++;
    else draw++;

    const key = `${p.homeScore}-${p.awayScore}`;
    scoreFreq.set(key, (scoreFreq.get(key) ?? 0) + 1);
  }

  const topScores = [...scoreFreq.entries()]
    .map(([score, count]) => ({ score, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const isFinished =
    match.status === "FINISHED" &&
    match.homeScore !== null &&
    match.awayScore !== null;

  let exactHits = 0;
  let realScore: string | null = null;
  if (isFinished) {
    realScore = `${match.homeScore}-${match.awayScore}`;
    for (const p of preds) {
      if (p.homeScore === match.homeScore && p.awayScore === match.awayScore) {
        exactHits++;
      }
    }
  }

  // Top 3 players' predictions for this match
  const topPicks: { position: number; name: string; homeScore: number; awayScore: number }[] = [];
  const ranking = await computeRanking();
  for (let i = 0; i < Math.min(3, ranking.length); i++) {
    const player = ranking[i];
    const pred = await prisma.matchPrediction.findUnique({
      where: { userId_matchId: { userId: player.id, matchId } },
      select: { homeScore: true, awayScore: true },
    });
    if (pred) {
      topPicks.push({
        position: i + 1,
        name: player.name,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
      });
    }
  }

  return NextResponse.json({
    match: {
      id: match.id,
      phase: match.phase,
      groupLabel: match.groupLabel,
      status: match.status,
      homeTeam: match.homeTeam?.name ?? "A definir",
      awayTeam: match.awayTeam?.name ?? "A definir",
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    },
    total: preds.length,
    distribution: { homeWin, draw, awayWin },
    topScores,
    isFinished,
    realScore,
    exactHits,
    topPicks,
  });
}
