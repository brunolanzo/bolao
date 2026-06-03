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

  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const [champions, runnersUp, thirdPlaces] = await Promise.all([
    rankPicks("championTeamId", teamName),
    rankPicks("runnerUpTeamId", teamName),
    rankPicks("thirdPlaceTeamId", teamName),
  ]);

  // Global most-predicted scoreline (across every match prediction) — fun bonus.
  const allPreds = await prisma.matchPrediction.groupBy({
    by: ["homeScore", "awayScore"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });
  const totalPreds = await prisma.matchPrediction.count();
  const popularScores = allPreds.map((p) => ({
    score: `${p.homeScore}-${p.awayScore}`,
    count: p._count.id,
    pct: totalPreds > 0 ? Math.round((p._count.id / totalPreds) * 100) : 0,
  }));

  // Matches available for the per-match analyzer (only ones with both teams set).
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
  const matchOptions: MatchOption[] = matches.map((m) => ({
    id: m.id,
    label: `[${phaseLabel[m.phase] ?? m.phase}${m.groupLabel ? " " + m.groupLabel : ""}] ${m.homeTeam?.name} × ${m.awayTeam?.name}${m.status === "FINISHED" ? " ✓" : ""}`,
    phase: m.phase,
    status: m.status,
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
      />
    </div>
  );
}
