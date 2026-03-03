import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GroupPredictions from "./GroupPredictions";

export default async function GruposPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const matches = await prisma.match.findMany({
    where: { phase: "GROUP" },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ groupLabel: "asc" }, { matchOrder: "asc" }],
  });

  const predictions = await prisma.matchPrediction.findMany({
    where: {
      userId: session.user.id,
      match: { phase: "GROUP" },
    },
  });

  const deadline = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });

  const isLocked = deadline ? new Date() > new Date(deadline.value) : false;

  // Group matches by group label
  const groups: Record<
    string,
    typeof matches
  > = {};
  for (const match of matches) {
    const group = match.groupLabel || "?";
    if (!groups[group]) groups[group] = [];
    groups[group].push(match);
  }

  // Transform predictions into a map
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
        <h1 className="text-2xl font-bold tracking-tight">Palpites - Fase de Grupos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Preencha seus palpites para todos os jogos da fase de grupos.
          {isLocked && (
            <span className="text-red-500 font-medium ml-2">
              Prazo encerrado - palpites bloqueados
            </span>
          )}
        </p>
      </div>

      <GroupPredictions
        groups={JSON.parse(JSON.stringify(groups))}
        initialPredictions={predMap}
        isLocked={isLocked}
        deadline={deadline?.value || null}
      />
    </div>
  );
}
