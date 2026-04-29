import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClassificationPredictions from "./ClassificationPredictions";

export const dynamic = "force-dynamic";

export default async function ClassificacaoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const teams = await prisma.team.findMany({
    orderBy: [{ groupLabel: "asc" }, { name: "asc" }],
  });

  const deadline = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });

  const bracketStateSetting = await prisma.settings.findUnique({
    where: { key: `BRACKET_${session.user.id}` },
  });

  const isLocked = deadline ? new Date() > new Date(deadline.value) : false;
  const bracketState = bracketStateSetting
    ? JSON.parse(bracketStateSetting.value)
    : {};

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Palpites Mata-Mata</h1>
        <p className="text-gray-500 text-sm mt-1">
          Preencha as posições dos grupos e avance pelo chaveamento oficial da Copa 2026.
          {isLocked && (
            <span className="text-red-500 font-medium ml-2">Prazo encerrado</span>
          )}
        </p>
      </div>

      <ClassificationPredictions
        teams={JSON.parse(JSON.stringify(teams))}
        initialBracketState={bracketState}
        isLocked={isLocked}
        deadline={deadline?.value || null}
      />
    </div>
  );
}
