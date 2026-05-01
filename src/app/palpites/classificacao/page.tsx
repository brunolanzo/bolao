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

  const groupMatches = await prisma.match.findMany({
    where: { phase: "GROUP" },
    select: { id: true, groupLabel: true, homeTeamId: true, awayTeamId: true },
  });

  const matchPredictions = await prisma.matchPrediction.findMany({
    where: { userId: session.user.id, match: { phase: "GROUP" } },
    select: { matchId: true, homeScore: true, awayScore: true },
  });

  const phasePredictions = await prisma.phasePrediction.findMany({
    where: { userId: session.user.id },
    select: { teamId: true, phase: true, correct: true, points: true },
  });

  // Aggregate points earned per phase (where resolution has happened)
  const phasePoints: Record<string, { earned: number; correct: number; resolved: number }> = {};
  // Per-team-per-phase resolution: teamId → phase → { correct, points }
  const teamPhaseResults: Record<string, Record<string, { correct: boolean | null; points: number | null }>> = {};
  for (const pp of phasePredictions) {
    if (!phasePoints[pp.phase]) phasePoints[pp.phase] = { earned: 0, correct: 0, resolved: 0 };
    const slot = phasePoints[pp.phase];
    if (pp.correct !== null) {
      slot.resolved++;
      if (pp.correct) slot.correct++;
    }
    if (pp.points !== null) slot.earned += pp.points;
    if (!teamPhaseResults[pp.teamId]) teamPhaseResults[pp.teamId] = {};
    teamPhaseResults[pp.teamId][pp.phase] = { correct: pp.correct, points: pp.points };
  }

  const predictionsMap: Record<string, { homeScore: number; awayScore: number }> = {};
  for (const p of matchPredictions) {
    predictionsMap[p.matchId] = { homeScore: p.homeScore, awayScore: p.awayScore };
  }

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
          As classificações dos grupos vêm dos seus palpites de placar. Aqui você define os vencedores
          do chaveamento oficial da Copa 2026.
          {isLocked && (
            <span className="text-red-500 font-medium ml-2">Prazo encerrado</span>
          )}
        </p>
      </div>

      <ClassificationPredictions
        teams={JSON.parse(JSON.stringify(teams))}
        groupMatches={groupMatches}
        predictionsMap={predictionsMap}
        phasePoints={phasePoints}
        teamPhaseResults={teamPhaseResults}
        initialBracketState={bracketState}
        isLocked={isLocked}
        deadline={deadline?.value || null}
      />
    </div>
  );
}
