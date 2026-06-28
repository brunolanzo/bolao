import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ParticipantesList from "./ParticipantesList";

export const dynamic = "force-dynamic";

export interface Participante {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  groupPredictions: number;
  groupTotal: number;
  bracketDone: boolean;
  paid: boolean;
  bankDone: boolean;
  /** Whether the participant has already filled a prediction for the next match. */
  nextMatchDone: boolean;
}

export interface NextMatchInfo {
  id: string;
  label: string; // "Oitavas · França × Suécia"
  when: string;  // "04/07 às 18:00"
}

const PHASE_SHORT: Record<string, string> = {
  GROUP: "Grupos",
  ROUND_32: "2ª Fase",
  ROUND_16: "Oitavas",
  QUARTERS: "Quartas",
  SEMIS: "Semis",
  THIRD_PLACE: "3º lugar",
  FINAL: "Final",
};

export default async function ParticipantesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  // Total fillable group matches (both teams assigned).
  const groupMatches = await prisma.match.findMany({
    where: { phase: "GROUP", homeTeamId: { not: null }, awayTeamId: { not: null } },
    select: { id: true },
  });
  const groupMatchIds = groupMatches.map((m) => m.id);
  const groupTotal = groupMatchIds.length;

  // Per-user count of group predictions.
  const predCounts =
    groupMatchIds.length > 0
      ? await prisma.matchPrediction.groupBy({
          by: ["userId"],
          where: { matchId: { in: groupMatchIds } },
          _count: { id: true },
        })
      : [];
  const predCountMap = new Map(predCounts.map((p) => [p.userId, p._count.id]));

  // Next match to be played: earliest SCHEDULED match with both teams assigned.
  // As games finish/start (status leaves SCHEDULED) this pointer advances on its
  // own — the page is force-dynamic, so it's recomputed on every load.
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

  // Who already filled a prediction for that next match.
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

  let nextMatchInfo: NextMatchInfo | null = null;
  if (nextMatch) {
    const phase = PHASE_SHORT[nextMatch.phase] ?? nextMatch.phase;
    const when = new Date(nextMatch.matchDate).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    nextMatchInfo = {
      id: nextMatch.id,
      label: `${phase} · ${nextMatch.homeTeam?.name ?? "?"} × ${nextMatch.awayTeam?.name ?? "?"}`,
      when: when.replace(", ", " às "),
    };
  }

  const users = await prisma.user.findMany({
    where: { role: "user" },
    orderBy: { name: "asc" },
    include: {
      payment: { select: { paid: true } },
      bankDetails: { select: { id: true } },
      championPrediction: { select: { id: true } },
    },
  });

  const participantes: Participante[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    groupPredictions: predCountMap.get(u.id) ?? 0,
    groupTotal,
    // Picking a champion is the last step of the bracket → good "done" proxy.
    bracketDone: u.championPrediction !== null,
    paid: u.payment?.paid ?? false,
    bankDone: u.bankDetails !== null,
    nextMatchDone: nextMatchPredUserIds.has(u.id),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Participantes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acompanhe as pendências de cada participante para ajudá-los a concluir o cadastro.
        </p>
      </div>
      <ParticipantesList
        participantes={participantes}
        currentUserId={session.user.id}
        nextMatch={nextMatchInfo}
      />
    </div>
  );
}
