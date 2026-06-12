import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeRanking, getRankingSnapshotPositions } from "@/lib/ranking";
import RankingTable, { type LastScore } from "./RankingTable";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const deadlineSetting = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });
  const isGroupLocked = deadlineSetting
    ? new Date() > new Date(deadlineSetting.value)
    : false;

  const baseRanking = await computeRanking();
  const prevPositions = await getRankingSnapshotPositions();

  // Attach position movement vs. the last-finished-match snapshot.
  const ranking = baseRanking.map((entry, i) => {
    const currentPos = i + 1;
    const prevPos = prevPositions.get(entry.id);
    // delta > 0 → climbed; < 0 → dropped; null → no baseline yet (new)
    const delta = prevPos != null ? prevPos - currentPos : null;
    return { ...entry, delta };
  });

  // Last score the admin entered — drives the "TEM GOL!" WhatsApp header.
  const lastScoreSetting = await prisma.settings.findUnique({
    where: { key: "LAST_SCORE" },
  });
  let lastScore: LastScore | null = null;
  if (lastScoreSetting?.value) {
    try {
      lastScore = JSON.parse(lastScoreSetting.value) as LastScore;
    } catch {
      lastScore = null;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Classificação geral dos participantes do bolão
        </p>
      </div>

      <RankingTable
        ranking={ranking}
        currentUserId={session.user.id}
        isGroupLocked={isGroupLocked}
        lastScore={lastScore}
      />
    </div>
  );
}
