import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RankingTable from "./RankingTable";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

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

  const ranking = users
    .map((user) => {
      // Exact scores (7 points)
      const exactScores = user.matchPredictions.filter(
        (p) => p.points === 7
      ).length;

      // Match points by phase type
      const groupMatchPts = user.matchPredictions
        .filter((p) => p.match.phase === "GROUP")
        .reduce((sum, p) => sum + (p.points || 0), 0);

      const knockoutMatchPts = user.matchPredictions
        .filter((p) => p.match.phase !== "GROUP")
        .reduce((sum, p) => sum + (p.points || 0), 0);

      const totalMatchPts = groupMatchPts + knockoutMatchPts;

      // Phase prediction points by phase
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

      // Champion prediction points
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
      // 1. Total points
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      // 2. Match points (tiebreaker 1)
      if (b.totalMatchPts !== a.totalMatchPts)
        return b.totalMatchPts - a.totalMatchPts;
      // 3. Phase classification points (tiebreaker 2)
      if (b.totalPhasePts !== a.totalPhasePts)
        return b.totalPhasePts - a.totalPhasePts;
      // 4. Champion/vice/3rd points (tiebreaker 3)
      return b.totalChampPts - a.totalChampPts;
    });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Classificação geral dos participantes do bolão
        </p>
      </div>

      <RankingTable ranking={ranking} currentUserId={session.user.id} />
    </div>
  );
}
