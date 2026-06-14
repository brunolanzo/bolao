import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EstatisticasClient from "./EstatisticasClient";

export const dynamic = "force-dynamic";

export interface RankedTeam {
  name: string;
  count: number;
  pct: number;
}

export interface MatchOption {
  id: string;
  label: string;
  phase: string;
  status: string;
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface GroupPendingUser {
  name: string;
  done: number;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface ExactHitMatch {
  label: string;       // "[Grupos A] México 2 x 1 África do Sul"
  score: string;       // "2 x 1"
  hitters: string[];   // names of people who nailed the exact score
}

async function rankPicks(
  field: "championTeamId" | "runnerUpTeamId" | "thirdPlaceTeamId",
  teamName: Map<string, string>
): Promise<{ ranking: RankedTeam[]; total: number }> {
  const groups = await prisma.championPrediction.groupBy({
    by: [field],
    _count: { [field]: true } as { championTeamId?: true; runnerUpTeamId?: true; thirdPlaceTeamId?: true },
  });
  const total = groups.reduce((acc, g) => acc + (g._count as Record<string, number>)[field], 0);
  const ranking = groups
    .map((g) => {
      const count = (g._count as Record<string, number>)[field];
      return {
        name: teamName.get(g[field] as string) ?? "—",
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
  return { ranking, total };
}

export default async function EstatisticasPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  // --- Pending users ---
  const groupMatches = await prisma.match.findMany({
    where: { phase: "GROUP", homeTeamId: { not: null }, awayTeamId: { not: null } },
    select: { id: true },
  });
  const groupMatchIds = groupMatches.map((m) => m.id);
  const groupTotal = groupMatchIds.length;

  const predCounts =
    groupMatchIds.length > 0
      ? await prisma.matchPrediction.groupBy({
          by: ["userId"],
          where: { matchId: { in: groupMatchIds } },
          _count: { id: true },
        })
      : [];
  const predCountMap = new Map(predCounts.map((p) => [p.userId, p._count.id]));

  const allUsers = await prisma.user.findMany({
    where: { role: "user" },
    orderBy: { name: "asc" },
    include: {
      payment: { select: { paid: true } },
      championPrediction: { select: { id: true } },
    },
  });

  const userOptions: UserOption[] = allUsers.map((u) => ({ id: u.id, name: u.name }));

  const unpaidUsers: string[] = allUsers
    .filter((u) => !(u.payment?.paid ?? false))
    .map((u) => u.name);

  const groupPendingUsers: GroupPendingUser[] = allUsers
    .filter((u) => (predCountMap.get(u.id) ?? 0) < groupTotal)
    .map((u) => ({ name: u.name, done: predCountMap.get(u.id) ?? 0 }));

  const bracketPendingUsers: string[] = allUsers
    .filter((u) => {
      const groupDone = groupTotal > 0 && (predCountMap.get(u.id) ?? 0) >= groupTotal;
      return groupDone && u.championPrediction === null;
    })
    .map((u) => u.name);

  // --- Champion rankings ---
  const [champions, runnersUp, thirdPlaces] = await Promise.all([
    rankPicks("championTeamId", teamName),
    rankPicks("runnerUpTeamId", teamName),
    rankPicks("thirdPlaceTeamId", teamName),
  ]);

  // --- Normalized popular scores (2-1 and 1-2 count as the same) ---
  const allMatchPreds = await prisma.matchPrediction.findMany({
    select: { homeScore: true, awayScore: true },
  });
  const totalPreds = allMatchPreds.length;
  const normFreq = new Map<string, number>();
  for (const p of allMatchPreds) {
    const hi = Math.max(p.homeScore, p.awayScore);
    const lo = Math.min(p.homeScore, p.awayScore);
    const key = `${hi}-${lo}`;
    normFreq.set(key, (normFreq.get(key) ?? 0) + 1);
  }
  const popularScores = [...normFreq.entries()]
    .map(([score, count]) => ({
      score,
      count,
      pct: totalPreds > 0 ? Math.round((count / totalPreds) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- Matches for per-match analyzer ---
  const matches = await prisma.match.findMany({
    where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
    include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    orderBy: { matchOrder: "asc" },
  });
  const phaseLabel: Record<string, string> = {
    GROUP: "Grupos",
    ROUND_32: "2ª Fase",
    ROUND_16: "Oitavas",
    QUARTERS: "Quartas",
    SEMIS: "Semis",
    THIRD_PLACE: "3º Lugar",
    FINAL: "Final",
  };
  const matchOptions: MatchOption[] = matches
    .map((m) => ({
      id: m.id,
      label: `[${phaseLabel[m.phase] ?? m.phase}${m.groupLabel ? " " + m.groupLabel : ""}] ${m.homeTeam?.name} × ${m.awayTeam?.name}${m.status === "FINISHED" ? " ✓" : ""}`,
      phase: m.phase,
      status: m.status,
    }))
    // Already-played (FINISHED) matches sink to the bottom; the rest keep
    // chronological (matchOrder) order thanks to the stable sort.
    .sort((a, b) => (a.status === "FINISHED" ? 1 : 0) - (b.status === "FINISHED" ? 1 : 0));

  // --- Exact-score hits across finished matches (placar cravado) ---
  const finishedMatches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      homeScore: { not: null },
      awayScore: { not: null },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      predictions: {
        where: { points: 7 }, // 7 pts = exact score
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { matchOrder: "desc" },
  });
  const exactHitMatches: ExactHitMatch[] = finishedMatches.map((m) => ({
    label: `[${phaseLabel[m.phase] ?? m.phase}${m.groupLabel ? " " + m.groupLabel : ""}] ${m.homeTeam?.name} ${m.homeScore} x ${m.awayScore} ${m.awayTeam?.name}`,
    score: `${m.homeScore} x ${m.awayScore}`,
    hitters: m.predictions.map((p) => p.user.name),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Estatísticas das Apostas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Dados ao vivo para você divulgar no grupo. Cada bloco tem um botão para copiar o texto pronto pro WhatsApp.
        </p>
      </div>

      <EstatisticasClient
        champions={champions}
        runnersUp={runnersUp}
        thirdPlaces={thirdPlaces}
        popularScores={popularScores}
        totalPreds={totalPreds}
        matchOptions={matchOptions}
        teams={teams}
        unpaidUsers={unpaidUsers}
        groupPendingUsers={groupPendingUsers}
        bracketPendingUsers={bracketPendingUsers}
        groupTotal={groupTotal}
        exactHitMatches={exactHitMatches}
        userOptions={userOptions}
      />
    </div>
  );
}
