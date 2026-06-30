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

export interface NextMatchPending {
  label: string | null;   // "Oitavas · França × Suécia · 04/07 às 18:00" (null if no next match)
  users: string[];        // names of participants who haven't filled it yet
}

export interface ParticipantRank {
  name: string;
  value: number;       // exact-hit count or points, depending on the ranking
  // Phase point rankings only: how many teams the participant correctly
  // predicted would reach this phase, out of how many they picked.
  acertos?: number;
  total?: number;
}

export interface PhasePointRanking {
  phase: string;
  label: string;
  ranking: ParticipantRank[];
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

  // --- Next match + who hasn't filled it ---
  // Next match to be played: earliest SCHEDULED match with both teams assigned.
  // Advances on its own as games finish (page is force-dynamic).
  const nextMatch = await prisma.match.findFirst({
    where: {
      status: "SCHEDULED",
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    orderBy: { matchDate: "asc" },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });
  const nextMatchPredUserIds = nextMatch
    ? new Set(
        (
          await prisma.matchPrediction.findMany({
            where: { matchId: nextMatch.id },
            select: { userId: true },
          })
        ).map((p) => p.userId),
      )
    : new Set<string>();
  const nextMatchPending: NextMatchPending = {
    label: nextMatch
      ? `${phaseLabel[nextMatch.phase] ?? nextMatch.phase} · ${nextMatch.homeTeam?.name} × ${nextMatch.awayTeam?.name} · ${new Date(
          nextMatch.matchDate,
        )
          .toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          })
          .replace(", ", " às ")}`
      : null,
    users: nextMatch
      ? allUsers.filter((u) => !nextMatchPredUserIds.has(u.id)).map((u) => u.name)
      : [],
  };

  // --- Participant rankings: group-phase exact hits + per-phase points ---
  // One pass over every participant's scored predictions. Match-prediction
  // points are read from the persisted `points` field (same source the live
  // ranking uses), and the knockout phase rankings add the phase-advancement
  // bonus (PhasePrediction) so each card reflects the FULL points earned in
  // that phase — not just placar points.
  const usersWithPreds = await prisma.user.findMany({
    where: { role: "user" },
    select: {
      name: true,
      matchPredictions: {
        where: { points: { not: null } },
        select: { points: true, match: { select: { phase: true } } },
      },
      phasePredictions: {
        select: { points: true, phase: true, correct: true },
      },
    },
  });

  const byValueThenName = (a: ParticipantRank, b: ParticipantRank) =>
    b.value - a.value || a.name.localeCompare(b.name, "pt-BR");

  // 1) Placares cravados na fase de grupos (count of exact scores, 7 pts).
  const groupExactRanking: ParticipantRank[] = usersWithPreds
    .map((u) => ({
      name: u.name,
      value: u.matchPredictions.filter(
        (p) => p.points === 7 && p.match.phase === "GROUP",
      ).length,
    }))
    .filter((r) => r.value > 0)
    .sort(byValueThenName);

  // 2) Pontuação por fase eliminatória. PhasePrediction.phase only covers
  //    ROUND_32..FINAL; THIRD_PLACE earns points solely from the match placar.
  const knockoutPhases: { key: string; label: string }[] = [
    { key: "ROUND_32", label: "16 avos (2ª Fase)" },
    { key: "ROUND_16", label: "Oitavas de Final" },
    { key: "QUARTERS", label: "Quartas de Final" },
    { key: "SEMIS", label: "Semifinais" },
    { key: "FINAL", label: "Final" },
    { key: "THIRD_PLACE", label: "Disputa 3º Lugar" },
  ];

  const phasePointRankings: PhasePointRanking[] = knockoutPhases.map(
    ({ key, label }) => ({
      phase: key,
      label,
      ranking: usersWithPreds
        .map((u) => {
          const matchPts = u.matchPredictions
            .filter((p) => p.match.phase === key)
            .reduce((sum, p) => sum + (p.points ?? 0), 0);
          const phasePreds = u.phasePredictions.filter((p) => p.phase === key);
          const bonusPts = phasePreds.reduce((sum, p) => sum + (p.points ?? 0), 0);
          // Acertos = teams the participant correctly predicted would reach this
          // phase; total = how many teams they picked for it.
          const total = phasePreds.length;
          const acertos = phasePreds.filter((p) => p.correct === true).length;
          const entry: ParticipantRank = { name: u.name, value: matchPts + bonusPts };
          if (total > 0) {
            entry.acertos = acertos;
            entry.total = total;
          }
          return entry;
        })
        .filter((r) => r.value > 0)
        .sort(byValueThenName),
    }),
  );

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
        groupExactRanking={groupExactRanking}
        phasePointRankings={phasePointRankings}
        nextMatchPending={nextMatchPending}
      />
    </div>
  );
}
