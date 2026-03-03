import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClassificationPredictions from "./ClassificationPredictions";

export default async function ClassificacaoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const teams = await prisma.team.findMany({
    orderBy: [{ groupLabel: "asc" }, { name: "asc" }],
  });

  const phasePredictions = await prisma.phasePrediction.findMany({
    where: { userId: session.user.id },
    include: { team: true },
  });

  const championPrediction = await prisma.championPrediction.findUnique({
    where: { userId: session.user.id },
  });

  const deadline = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });

  const isLocked = deadline ? new Date() > new Date(deadline.value) : false;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Previsão de Classificação
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Selecione quais seleções você acredita que avançarão em cada fase.
          {isLocked && (
            <span className="text-red-500 font-medium ml-2">
              Prazo encerrado
            </span>
          )}
        </p>
      </div>

      <ClassificationPredictions
        teams={JSON.parse(JSON.stringify(teams))}
        initialPhasePredictions={JSON.parse(JSON.stringify(phasePredictions))}
        initialChampionPrediction={
          championPrediction
            ? JSON.parse(JSON.stringify(championPrediction))
            : null
        }
        isLocked={isLocked}
        deadline={deadline?.value || null}
      />
    </div>
  );
}
