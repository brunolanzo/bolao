import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import KnockoutPredictions from "./KnockoutPredictions";

export const dynamic = "force-dynamic";

export default async function EliminatoriasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const matches = await prisma.match.findMany({
    where: {
      phase: { not: "GROUP" },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchOrder: "asc" },
  });

  const predictions = await prisma.matchPrediction.findMany({
    where: {
      userId: session.user.id,
      match: { phase: { not: "GROUP" } },
    },
  });

  const predMap: Record<string, { homeScore: number; awayScore: number }> = {};
  for (const pred of predictions) {
    predMap[pred.matchId] = {
      homeScore: pred.homeScore,
      awayScore: pred.awayScore,
    };
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Palpites - Eliminatórias
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Preencha seus palpites para os jogos das fases eliminatórias.
          Confrontos aparecem conforme são definidos pelo administrador.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border border-gray-200 rounded-lg">
          <p>Nenhum confronto das eliminatórias foi definido ainda.</p>
          <p className="text-sm mt-1">
            Os jogos serão exibidos conforme o administrador definir os confrontos.
          </p>
        </div>
      ) : (
        <KnockoutPredictions
          matches={JSON.parse(JSON.stringify(matches))}
          initialPredictions={predMap}
        />
      )}
    </div>
  );
}
