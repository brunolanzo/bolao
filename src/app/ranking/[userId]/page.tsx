import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { calcMatchPoints, PHASE_LABELS, CHAMPION_POINTS, RUNNER_UP_POINTS, THIRD_PLACE_POINTS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const PHASE_ORDER = ["ROUND_32", "ROUND_16", "QUARTERS", "SEMIS", "FINAL"] as const;
const KNOCKOUT_ORDER = ["ROUND_32", "ROUND_16", "QUARTERS", "SEMIS", "THIRD_PLACE", "FINAL"] as const;

// For match prediction sections (FINAL = "Final", not "Finalistas")
const MATCH_PHASE_LABELS: Record<string, string> = {
  ROUND_32: "Segunda Fase",
  ROUND_16: "Oitavas de Final",
  QUARTERS: "Quartas de Final",
  SEMIS: "Semifinais",
  THIRD_PLACE: "Disputa 3º / 4º Lugar",
  FINAL: "Final",
};

function ptsBadgeClass(pts: number | null | undefined) {
  if (pts === null || pts === undefined) return "bg-gray-100 text-gray-400";
  if (pts === 0) return "bg-gray-100 text-gray-500";
  if (pts >= 7) return "bg-green-600 text-white";
  if (pts >= 4) return "bg-green-100 text-green-700";
  return "bg-yellow-100 text-yellow-700";
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { userId } = await params;

  // Load the viewed user
  const viewedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });
  if (!viewedUser || viewedUser.role === "admin") notFound();

  // GROUP_DEADLINE gate
  const deadlineSetting = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });
  const isGroupLocked = deadlineSetting
    ? new Date() > new Date(deadlineSetting.value)
    : false;

  // ── Ranking position ──────────────────────────────────────────────────────
  const allUsers = await prisma.user.findMany({
    where: { role: "user" },
    include: {
      matchPredictions: { where: { points: { not: null } } },
      phasePredictions: { where: { points: { not: null } } },
      championPrediction: true,
    },
  });

  const allRanked = allUsers
    .map((u) => ({
      id: u.id,
      totalPoints:
        u.matchPredictions.reduce((s, p) => s + (p.points ?? 0), 0) +
        u.phasePredictions.reduce((s, p) => s + (p.points ?? 0), 0) +
        (u.championPrediction?.championPoints ?? 0) +
        (u.championPrediction?.runnerUpPoints ?? 0) +
        (u.championPrediction?.thirdPlacePoints ?? 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const rankPosition = allRanked.findIndex((u) => u.id === userId) + 1;
  const totalPoints = allRanked.find((u) => u.id === userId)?.totalPoints ?? 0;

  const now = new Date();
  const isMe = session.user.id === userId;

  // ── Fetch predictions (only if locked) ───────────────────────────────────
  const championPrediction = isGroupLocked
    ? await prisma.championPrediction.findUnique({
        where: { userId },
        include: {
          champion: { select: { name: true, code: true } },
          runnerUp: { select: { name: true, code: true } },
          thirdPlace: { select: { name: true, code: true } },
        },
      })
    : null;

  const phasePredictions = isGroupLocked
    ? await prisma.phasePrediction.findMany({
        where: { userId },
        include: { team: { select: { name: true, code: true } } },
      })
    : [];

  const allMatchPredictions = await prisma.matchPrediction.findMany({
    where: { userId },
    include: {
      match: {
        include: {
          homeTeam: { select: { name: true, code: true } },
          awayTeam: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: { match: { matchOrder: "asc" } },
  });

  // Only show predictions whose deadline has passed
  const visiblePredictions = allMatchPredictions.filter((mp) => {
    if (mp.match.phase === "GROUP") return isGroupLocked;
    return new Date(mp.match.matchDate) < now;
  });

  // Organise match predictions
  const groupPreds = visiblePredictions.filter((mp) => mp.match.phase === "GROUP");
  const knockoutPreds = visiblePredictions.filter((mp) => mp.match.phase !== "GROUP");

  const byGroup: Record<string, typeof groupPreds> = {};
  for (const mp of groupPreds) {
    const g = mp.match.groupLabel ?? "?";
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(mp);
  }

  const byPhase: Record<string, typeof knockoutPreds> = {};
  for (const mp of knockoutPreds) {
    if (!byPhase[mp.match.phase]) byPhase[mp.match.phase] = [];
    byPhase[mp.match.phase].push(mp);
  }

  // Organise phase predictions
  const phasePredsByPhase: Record<string, typeof phasePredictions> = {};
  for (const pp of phasePredictions) {
    if (!phasePredsByPhase[pp.phase]) phasePredsByPhase[pp.phase] = [];
    phasePredsByPhase[pp.phase].push(pp);
  }

  const hasAnyContent =
    !!championPrediction ||
    phasePredictions.length > 0 ||
    groupPreds.length > 0 ||
    knockoutPreds.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/ranking"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar ao Ranking
      </Link>

      {/* Header card */}
      <div className="border border-green-200 rounded-xl p-5 mb-6 bg-gradient-to-r from-green-50 to-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                rankPosition === 1
                  ? "bg-[#FFDF00] text-[#004D20]"
                  : rankPosition === 2
                    ? "bg-gray-300 text-gray-700"
                    : rankPosition === 3
                      ? "bg-orange-200 text-orange-800"
                      : "bg-gray-100 text-gray-500"
              }`}
            >
              {rankPosition}º
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {viewedUser.name}
                {isMe && (
                  <span className="text-sm text-gray-400 font-normal ml-2">(você)</span>
                )}
              </h1>
              <p className="text-sm text-gray-500">{rankPosition}º lugar · {allRanked.length} participantes</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-[#006B2B]">{totalPoints}</p>
            <p className="text-xs text-gray-400">pontos</p>
          </div>
        </div>
      </div>

      {/* Not locked yet */}
      {!isGroupLocked ? (
        <div className="border border-amber-200 rounded-xl p-8 text-center bg-amber-50">
          <p className="text-amber-700 font-medium mb-1">Palpites ainda não visíveis</p>
          <p className="text-sm text-amber-600">
            Os palpites ficam disponíveis para todos após o encerramento do prazo de apostas.
          </p>
        </div>
      ) : !hasAnyContent ? (
        <div className="border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          Este participante ainda não registrou palpites.
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Pódio ─────────────────────────────────────────────────── */}
          {championPrediction && (
            <section>
              <h2 className="text-xs font-semibold text-[#006B2B] uppercase tracking-wider mb-3">
                Pódio
              </h2>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  {(
                    [
                      {
                        label: "🏆 Campeão",
                        team: championPrediction.champion,
                        pts: championPrediction.championPoints,
                        max: CHAMPION_POINTS,
                      },
                      {
                        label: "🥈 Vice",
                        team: championPrediction.runnerUp,
                        pts: championPrediction.runnerUpPoints,
                        max: RUNNER_UP_POINTS,
                      },
                      {
                        label: "🥉 3º Lugar",
                        team: championPrediction.thirdPlace,
                        pts: championPrediction.thirdPlacePoints,
                        max: THIRD_PLACE_POINTS,
                      },
                    ] as const
                  ).map(({ label, team, pts, max }) => (
                    <div key={label} className="p-4 text-center">
                      <p className="text-[11px] text-gray-400 mb-2">{label}</p>
                      <p className="font-semibold text-sm leading-tight">{team.name}</p>
                      <p className="text-xs text-gray-400 font-mono mb-2">{team.code}</p>
                      {pts !== null ? (
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pts > 0 ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {pts > 0 ? `+${pts} pts` : "0 pts"}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] text-gray-300 px-2 py-0.5 rounded-full bg-gray-50">
                          {max} pts possíveis
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Classificados por fase ────────────────────────────────── */}
          {PHASE_ORDER.some((p) => phasePredsByPhase[p]?.length > 0) && (
            <section>
              <h2 className="text-xs font-semibold text-[#006B2B] uppercase tracking-wider mb-3">
                Classificados por Fase
              </h2>
              <div className="space-y-3">
                {PHASE_ORDER.map((phase) => {
                  const preds = phasePredsByPhase[phase];
                  if (!preds?.length) return null;
                  const earned = preds.reduce((s, p) => s + (p.points ?? 0), 0);
                  const resolved = preds.filter((p) => p.correct !== null).length;
                  const correct = preds.filter((p) => p.correct === true).length;
                  return (
                    <div key={phase} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">{PHASE_LABELS[phase]}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {resolved > 0 && (
                            <span>
                              {correct}/{resolved} acertos
                            </span>
                          )}
                          {earned > 0 && (
                            <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                              +{earned} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {preds
                          .sort((a, b) => a.team.code.localeCompare(b.team.code))
                          .map((pp) => (
                            <span
                              key={pp.id}
                              title={pp.team.code}
                              className={`text-xs px-2 py-1 rounded-lg font-medium border ${
                                pp.correct === true
                                  ? "bg-green-100 border-green-300 text-green-800"
                                  : pp.correct === false
                                    ? "bg-red-50 border-red-200 text-red-500 line-through"
                                    : "bg-gray-50 border-gray-200 text-gray-700"
                              }`}
                            >
                              {pp.team.code}
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Palpites — Fase de Grupos ─────────────────────────────── */}
          {Object.keys(byGroup).length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#006B2B] uppercase tracking-wider mb-3">
                Palpites — Fase de Grupos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(byGroup)
                  .sort()
                  .map((groupLabel) => {
                    const preds = byGroup[groupLabel];
                    const earned = preds.reduce((s, mp) => s + (mp.points ?? 0), 0);
                    const finished = preds.filter(
                      (mp) => mp.match.status === "FINISHED"
                    ).length;
                    return (
                      <div key={groupLabel} className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <h3 className="font-semibold text-sm">Grupo {groupLabel}</h3>
                          <div className="flex items-center gap-1.5">
                            {finished > 0 && (
                              <span className="text-[10px] text-gray-400">
                                {finished}/{preds.length}
                              </span>
                            )}
                            {earned > 0 && (
                              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                                +{earned} pts
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {preds.map((mp) => {
                            const isFinished =
                              mp.match.status === "FINISHED" &&
                              mp.match.homeScore !== null &&
                              mp.match.awayScore !== null;
                            const pts = isFinished
                              ? calcMatchPoints(
                                  mp.homeScore,
                                  mp.awayScore,
                                  mp.match.homeScore!,
                                  mp.match.awayScore!
                                )
                              : null;
                            return (
                              <div key={mp.id} className="flex items-center gap-1 text-xs">
                                <span className="text-gray-400 w-9 shrink-0 text-[11px]">
                                  {new Date(mp.match.matchDate).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </span>
                                <span className="flex-1 text-right text-gray-700 truncate font-medium">
                                  {mp.match.homeTeam?.code ?? "?"}
                                </span>
                                <span className="font-bold text-gray-900 tabular-nums w-4 text-center">
                                  {mp.homeScore}
                                </span>
                                <span className="text-gray-300 text-[10px]">×</span>
                                <span className="font-bold text-gray-900 tabular-nums w-4 text-center">
                                  {mp.awayScore}
                                </span>
                                <span className="flex-1 text-gray-700 truncate font-medium">
                                  {mp.match.awayTeam?.code ?? "?"}
                                </span>
                                <div className="w-[3.25rem] flex justify-end shrink-0">
                                  {isFinished ? (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ptsBadgeClass(pts)}`}
                                    >
                                      {pts} pt{pts === 1 ? "" : "s"}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-gray-300">–</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* ── Palpites — Eliminatórias ──────────────────────────────── */}
          {KNOCKOUT_ORDER.some((p) => byPhase[p]?.length > 0) && (
            <section>
              <h2 className="text-xs font-semibold text-[#006B2B] uppercase tracking-wider mb-3">
                Palpites — Eliminatórias
              </h2>
              <div className="space-y-3">
                {KNOCKOUT_ORDER.map((phase) => {
                  const preds = byPhase[phase];
                  if (!preds?.length) return null;
                  const earned = preds.reduce((s, mp) => s + (mp.points ?? 0), 0);
                  return (
                    <div key={phase} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="font-semibold text-sm">
                          {MATCH_PHASE_LABELS[phase]}
                        </h3>
                        {earned > 0 && (
                          <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                            +{earned} pts
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {preds.map((mp) => {
                          const isFinished =
                            mp.match.status === "FINISHED" &&
                            mp.match.homeScore !== null &&
                            mp.match.awayScore !== null;
                          const pts = isFinished
                            ? calcMatchPoints(
                                mp.homeScore,
                                mp.awayScore,
                                mp.match.homeScore!,
                                mp.match.awayScore!
                              )
                            : null;
                          return (
                            <div key={mp.id} className="flex items-center gap-1 text-xs">
                              <span className="text-gray-400 w-9 shrink-0 text-[11px]">
                                {new Date(mp.match.matchDate).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                              <span className="flex-1 text-right text-gray-700 truncate font-medium">
                                {mp.match.homeTeam?.name ?? "TBD"}
                              </span>
                              <span className="font-bold text-gray-900 tabular-nums w-4 text-center">
                                {mp.homeScore}
                              </span>
                              <span className="text-gray-300 text-[10px]">×</span>
                              <span className="font-bold text-gray-900 tabular-nums w-4 text-center">
                                {mp.awayScore}
                              </span>
                              <span className="flex-1 text-gray-700 truncate font-medium">
                                {mp.match.awayTeam?.name ?? "TBD"}
                              </span>
                              <div className="w-[3.25rem] flex justify-end shrink-0">
                                {isFinished ? (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ptsBadgeClass(pts)}`}
                                  >
                                    {pts} pt{pts === 1 ? "" : "s"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-300">–</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
