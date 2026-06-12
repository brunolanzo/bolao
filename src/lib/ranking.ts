import { prisma } from "@/lib/prisma";

export interface RankingEntry {
  id: string;
  name: string;
  exactScores: number;
  groupMatchPts: number;
  knockoutMatchPts: number;
  round32Pts: number;
  round16Pts: number;
  quartersPts: number;
  semisPts: number;
  finalPts: number;
  championPts: number;
  runnerUpPts: number;
  thirdPlacePts: number;
  totalMatchPts: number;
  totalPhasePts: number;
  totalChampPts: number;
  totalPoints: number;
}

/**
 * Computes the full live ranking from current prediction points.
 *
 * Match-prediction points are counted as soon as they are scored — which now
 * includes LIVE matches — so the ranking reflects the scoreline the admin last
 * entered, even mid-game. Phase/champion points still only count once resolved.
 */
export async function computeRanking(): Promise<RankingEntry[]> {
  const users = await prisma.user.findMany({
    where: { role: "user" },
    include: {
      matchPredictions: {
        where: { points: { not: null } },
        include: { match: { select: { phase: true } } },
      },
      phasePredictions: {
        where: { points: { not: null } },
      },
      championPrediction: true,
    },
  });

  return users
    .map((user) => {
      const exactScores = user.matchPredictions.filter((p) => p.points === 7).length;

      const groupMatchPts = user.matchPredictions
        .filter((p) => p.match.phase === "GROUP")
        .reduce((sum, p) => sum + (p.points || 0), 0);

      const knockoutMatchPts = user.matchPredictions
        .filter((p) => p.match.phase !== "GROUP")
        .reduce((sum, p) => sum + (p.points || 0), 0);

      const totalMatchPts = groupMatchPts + knockoutMatchPts;

      const phasePts = (phase: string) =>
        user.phasePredictions
          .filter((p) => p.phase === phase)
          .reduce((sum, p) => sum + (p.points || 0), 0);

      const round32Pts = phasePts("ROUND_32");
      const round16Pts = phasePts("ROUND_16");
      const quartersPts = phasePts("QUARTERS");
      const semisPts = phasePts("SEMIS");
      const finalPts = phasePts("FINAL");
      const totalPhasePts =
        round32Pts + round16Pts + quartersPts + semisPts + finalPts;

      const championPts = user.championPrediction?.championPoints || 0;
      const runnerUpPts = user.championPrediction?.runnerUpPoints || 0;
      const thirdPlacePts = user.championPrediction?.thirdPlacePoints || 0;
      const totalChampPts = championPts + runnerUpPts + thirdPlacePts;

      const totalPoints = totalMatchPts + totalPhasePts + totalChampPts;

      return {
        id: user.id,
        name: user.name,
        exactScores,
        groupMatchPts,
        knockoutMatchPts,
        round32Pts,
        round16Pts,
        quartersPts,
        semisPts,
        finalPts,
        championPts,
        runnerUpPts,
        thirdPlacePts,
        totalMatchPts,
        totalPhasePts,
        totalChampPts,
        totalPoints,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.totalMatchPts !== a.totalMatchPts) return b.totalMatchPts - a.totalMatchPts;
      if (b.totalPhasePts !== a.totalPhasePts) return b.totalPhasePts - a.totalPhasePts;
      if (b.totalChampPts !== a.totalChampPts) return b.totalChampPts - a.totalChampPts;
      return (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");
    });
}

/** Stored ranking snapshot (ordered user ids) representing the standings at the
 *  end of the last finished match. Used to show position movement arrows. */
export const RANKING_SNAPSHOT_KEY = "RANKING_SNAPSHOT";

/** Persist the current ranking order as the comparison baseline. */
export async function saveRankingSnapshot(): Promise<void> {
  const ranking = await computeRanking();
  const orderedIds = ranking.map((r) => r.id);
  await prisma.settings.upsert({
    where: { key: RANKING_SNAPSHOT_KEY },
    create: { key: RANKING_SNAPSHOT_KEY, value: JSON.stringify(orderedIds) },
    update: { value: JSON.stringify(orderedIds) },
  });
}

/** Map of userId → previous position (1-based) from the stored snapshot. */
export async function getRankingSnapshotPositions(): Promise<Map<string, number>> {
  const setting = await prisma.settings.findUnique({ where: { key: RANKING_SNAPSHOT_KEY } });
  const map = new Map<string, number>();
  if (!setting?.value) return map;
  try {
    const ids = JSON.parse(setting.value) as string[];
    ids.forEach((id, i) => map.set(id, i + 1));
  } catch {
    // ignore malformed snapshot
  }
  return map;
}
