import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupEspnScore } from "@/lib/espn";
import { calcMatchPoints } from "@/lib/scoring";
import { resolvePhases } from "@/lib/resolvePhases";
import { saveRankingSnapshot } from "@/lib/ranking";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/espn-sync?secret=<CRON_SECRET>
 *
 * Server-side ESPN polling — runs without any browser open.
 * Intended to be called by a Hostinger cron job every minute.
 *
 * Finds all currently live matches, fetches their score from ESPN,
 * and saves any changes using the same logic as /api/admin/results.
 *
 * Safety guards (same as client-side):
 *  - Never sets status to SCHEDULED
 *  - Never decreases an already-saved score
 *  - Only updates when something actually changed
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  // Find matches that are live or kicked off in the last 3h and aren't finished
  const liveMatches = await prisma.match.findMany({
    where: {
      OR: [
        { status: "LIVE" },
        {
          status: { not: "FINISHED" },
          matchDate: { lte: now, gte: threeHoursAgo },
        },
      ],
    },
    include: { homeTeam: true, awayTeam: true },
  });

  if (liveMatches.length === 0) {
    return NextResponse.json({ ok: true, message: "Nenhum jogo ao vivo", updated: 0 });
  }

  const results: { matchId: string; result: string }[] = [];
  let anyFinished = false;
  let anyUpdated = false;

  for (const match of liveMatches) {
    if (!match.homeTeam || !match.awayTeam) {
      results.push({ matchId: match.id, result: "times não definidos" });
      continue;
    }

    const espn = await lookupEspnScore(
      match.homeTeam.code,
      match.awayTeam.code,
      new Date(match.matchDate),
    );

    if (!espn.found) {
      results.push({ matchId: match.id, result: espn.reason ?? "não encontrado" });
      continue;
    }

    const newHome = espn.homeScore!;
    const newAway = espn.awayScore!;
    const newStatus = espn.status!; // "LIVE" | "FINISHED" — never SCHEDULED

    // Safety: never decrease an already-saved score
    if (
      (match.homeScore !== null && newHome < match.homeScore) ||
      (match.awayScore !== null && newAway < match.awayScore)
    ) {
      results.push({
        matchId: match.id,
        result: `ignorado: ESPN ${newHome}x${newAway} < atual ${match.homeScore}x${match.awayScore}`,
      });
      continue;
    }

    const changed =
      match.homeScore !== newHome ||
      match.awayScore !== newAway ||
      match.status !== newStatus;

    if (!changed) {
      results.push({ matchId: match.id, result: `sem mudança (${newHome}x${newAway})` });
      continue;
    }

    // Save to database
    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore: newHome, awayScore: newAway, status: newStatus },
    });

    // Recalculate prediction points for all participants
    const predictions = await prisma.matchPrediction.findMany({
      where: { matchId: match.id },
    });
    for (const pred of predictions) {
      const points = calcMatchPoints(pred.homeScore, pred.awayScore, newHome, newAway);
      await prisma.matchPrediction.update({
        where: { id: pred.id },
        data: { points },
      });
    }

    // Update last score setting (drives "TEM GOL!" header on ranking)
    await prisma.settings.upsert({
      where: { key: "LAST_SCORE" },
      create: {
        key: "LAST_SCORE",
        value: JSON.stringify({
          homeName: match.homeTeam.name,
          awayName: match.awayTeam.name,
          homeScore: newHome,
          awayScore: newAway,
          status: newStatus,
        }),
      },
      update: {
        value: JSON.stringify({
          homeName: match.homeTeam.name,
          awayName: match.awayTeam.name,
          homeScore: newHome,
          awayScore: newAway,
          status: newStatus,
        }),
      },
    });

    if (newStatus === "FINISHED") anyFinished = true;
    anyUpdated = true;

    results.push({
      matchId: match.id,
      result: `salvo ${newHome}x${newAway}${newStatus === "FINISHED" ? " (FIM)" : ""}`,
    });
  }

  // Recalculate phase qualifiers after any score change
  if (anyUpdated) {
    await resolvePhases();
  }

  // Snapshot ranking when a match is finalized (drives movement arrows)
  if (anyFinished) {
    await saveRankingSnapshot();
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    liveMatches: liveMatches.length,
    updated: results.filter((r) => r.result.startsWith("salvo")).length,
    results,
  });
}
