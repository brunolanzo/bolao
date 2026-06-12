"use client";

import { useState } from "react";
import Link from "next/link";
import { formatName } from "@/lib/formatName";

interface RankingEntry {
  id: string;
  name: string;
  exactScores: number;
  groupMatchPts: number;
  knockoutMatchPts: number;
  round32Pts: number;
  round16Pts: number;
  quartersPts: number;
  semisPts: number;
  finalPts: number;
  championPts: number;
  runnerUpPts: number;
  thirdPlacePts: number;
  totalMatchPts: number;
  totalPhasePts: number;
  totalChampPts: number;
  totalPoints: number;
  /** Positions gained (+) or lost (−) vs. the last finished match. null = no baseline yet. */
  delta: number | null;
}

export interface LastScore {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

interface Props {
  ranking: RankingEntry[];
  currentUserId: string;
  isGroupLocked: boolean;
  lastScore: LastScore | null;
}

/** WhatsApp header announcing the scoreline of the match the admin last updated. */
function scoreHeaderText(ls: LastScore): string {
  if (ls.homeScore === 0 && ls.awayScore === 0) {
    return `🟢 *BOLA ROLANDO!* ${ls.homeName} 0 x 0 ${ls.awayName}`;
  }
  return `⚽ *TEM GOL!* ${ls.homeName} ${ls.homeScore} x ${ls.awayScore} ${ls.awayName}`;
}

/** Compact ▲/▼ movement badge for the UI tables. */
function MovementArrow({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return <span className="text-gray-300 text-xs" title="Sem mudança">–</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-green-600 text-xs font-semibold" title={`Subiu ${delta} posição(ões)`}>
        ▲{delta}
      </span>
    );
  }
  return (
    <span className="text-red-500 text-xs font-semibold" title={`Caiu ${-delta} posição(ões)`}>
      ▼{-delta}
    </span>
  );
}

/** ▲/▼ marker for the WhatsApp copy text. */
function arrowText(delta: number | null): string {
  if (delta == null || delta === 0) return "";
  return delta > 0 ? ` 🔺${delta}` : ` 🔻${-delta}`;
}

function CopyRankingButton({ ranking, lastScore }: { ranking: RankingEntry[]; lastScore: LastScore | null }) {
  const [copied, setCopied] = useState(false);

  function buildText() {
    const medals = ["🥇", "🥈", "🥉"];
    const lines = ranking.map((u, i) => {
      const pos = medals[i] ?? `${i + 1}.`;
      return `${pos} ${formatName(u.name)} — ${u.totalPoints} pts${arrowText(u.delta)}`;
    });
    const header = lastScore ? `${scoreHeaderText(lastScore)}\n\n` : "";
    return `${header}🏆 *Ranking — Nosso Bolão 2026*\n\n${lines.join("\n")}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildText());
    } catch {
      const ta = document.createElement("textarea");
      ta.value = buildText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={copy}
      className="text-xs font-medium border border-green-300 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-50 transition-colors"
    >
      {copied ? "✓ Copiado!" : "📋 Copiar pro WhatsApp"}
    </button>
  );
}

export default function RankingTable({ ranking, currentUserId, isGroupLocked, lastScore }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (ranking.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-400">
        Nenhuma pontuação registrada ainda
      </div>
    );
  }

  return (
    <>
      {/* Copy to WhatsApp */}
      <div className="mb-4 flex justify-end">
        <CopyRankingButton ranking={ranking} lastScore={lastScore} />
      </div>

      {/* Transparency hint — only after lock */}
      {isGroupLocked && (
        <div className="mb-4 flex items-center gap-2 text-sm text-[#006B2B] bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>
            <strong>Transparência:</strong> clique no nome de qualquer participante para ver todos os palpites e pontuação jogo a jogo.
          </span>
        </div>
      )}

      {/* Desktop: scrollable table */}
      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              {/* Group headers */}
              <tr className="bg-[#006B2B] text-white text-xs">
                <th colSpan={2} className="px-3 py-1.5 text-left font-medium" />
                <th
                  colSpan={3}
                  className="px-3 py-1.5 text-center font-medium border-l border-green-500"
                >
                  Jogos
                </th>
                <th
                  colSpan={5}
                  className="px-3 py-1.5 text-center font-medium border-l border-green-500"
                >
                  Classificados
                </th>
                <th
                  colSpan={3}
                  className="px-3 py-1.5 text-center font-medium border-l border-green-500"
                >
                  Pódio
                </th>
                <th
                  className="px-3 py-1.5 text-center font-medium border-l border-green-500"
                />
              </tr>
              {/* Column headers */}
              <tr className="bg-green-50 text-xs text-gray-500">
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Participante</th>
                <th className="text-center px-3 py-2 font-medium border-l border-gray-200" title="Placares exatos (7 pontos)">
                  🎯
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Pontos em jogos da fase de grupos">
                  Grupos
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Pontos em jogos das eliminatórias">
                  Elim.
                </th>
                <th className="text-center px-3 py-2 font-medium border-l border-gray-200" title="Classificados Segunda Fase (32 times)">
                  2ª Fase
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Classificados Oitavas de Final">
                  Oitavas
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Classificados Quartas de Final">
                  Quartas
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Classificados Semifinais">
                  Semis
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Finalistas corretos (2 times na grande final)">
                  Finalistas
                </th>
                <th className="text-center px-3 py-2 font-medium border-l border-gray-200" title="Campeão correto (25 pts)">
                  🏆
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Vice-campeão correto (20 pts)">
                  🥈
                </th>
                <th className="text-center px-3 py-2 font-medium" title="Terceiro colocado correto (15 pts)">
                  🥉
                </th>
                <th className="text-center px-3 py-2 font-bold border-l border-gray-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((user, i) => (
                <tr
                  key={user.id}
                  className={`border-t border-gray-100 ${
                    user.id === currentUserId ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={i < 3 ? "font-bold" : "text-gray-400"}>
                        {i + 1}
                      </span>
                      <MovementArrow delta={user.delta} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isGroupLocked ? (
                      <Link
                        href={`/ranking/${user.id}`}
                        className={`hover:text-[#006B2B] hover:underline transition-colors ${i < 3 ? "font-medium" : ""}`}
                      >
                        {formatName(user.name)}
                      </Link>
                    ) : (
                      <span className={i < 3 ? "font-medium" : ""}>{formatName(user.name)}</span>
                    )}
                    {user.id === currentUserId && (
                      <span className="text-xs text-gray-400 ml-1">(você)</span>
                    )}
                  </td>
                  <td className="text-center px-3 py-2.5 border-l border-gray-100 font-medium text-[#006B2B]">
                    {user.exactScores}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.groupMatchPts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.knockoutMatchPts}
                  </td>
                  <td className="text-center px-3 py-2.5 border-l border-gray-100 text-gray-500">
                    {user.round32Pts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.round16Pts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.quartersPts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.semisPts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.finalPts}
                  </td>
                  <td className="text-center px-3 py-2.5 border-l border-gray-100 text-gray-500">
                    {user.championPts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.runnerUpPts}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {user.thirdPlacePts}
                  </td>
                  <td className="text-center px-3 py-2.5 border-l border-gray-100 font-bold text-lg">
                    {user.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: cards with expandable details */}
      <div className="md:hidden space-y-2">
        {ranking.map((user, i) => {
          const isExpanded = expandedId === user.id;
          const isMe = user.id === currentUserId;

          return (
            <div
              key={user.id}
              className={`border rounded-lg overflow-hidden ${
                isMe ? "border-[#FFDF00] bg-yellow-50" : "border-gray-200"
              }`}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : user.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? "bg-[#FFDF00] text-[#004D20]"
                        : i === 1
                          ? "bg-gray-300 text-gray-700"
                          : i === 2
                            ? "bg-orange-200 text-orange-800"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm ${i < 3 ? "font-bold" : ""}`}>
                        {formatName(user.name)}
                      </span>
                      {isMe && (
                        <span className="text-xs text-gray-400">(você)</span>
                      )}
                      {isGroupLocked && (
                        <Link
                          href={`/ranking/${user.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-[#006B2B] underline ml-1 shrink-0"
                        >
                          ver palpites
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        🎯 {user.exactScores}
                      </span>
                      <MovementArrow delta={user.delta} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{user.totalPoints}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-white">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {/* Match points */}
                    <div className="col-span-2 text-xs font-semibold text-[#006B2B] uppercase tracking-wide mb-1">
                      Jogos
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Grupos</span>
                      <span className="font-medium">{user.groupMatchPts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Eliminatórias</span>
                      <span className="font-medium">
                        {user.knockoutMatchPts}
                      </span>
                    </div>

                    {/* Phase prediction points */}
                    <div className="col-span-2 text-xs font-semibold text-[#006B2B] uppercase tracking-wide mt-2 mb-1">
                      Classificados
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Segunda Fase</span>
                      <span className="font-medium">{user.round32Pts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Oitavas</span>
                      <span className="font-medium">{user.round16Pts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quartas</span>
                      <span className="font-medium">{user.quartersPts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Semis</span>
                      <span className="font-medium">{user.semisPts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Finalistas</span>
                      <span className="font-medium">{user.finalPts}</span>
                    </div>

                    {/* Champion points */}
                    <div className="col-span-2 text-xs font-semibold text-[#006B2B] uppercase tracking-wide mt-2 mb-1">
                      Pódio
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">🏆 Campeão</span>
                      <span className="font-medium">{user.championPts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">🥈 Vice</span>
                      <span className="font-medium">{user.runnerUpPts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">🥉 3º Lugar</span>
                      <span className="font-medium">{user.thirdPlacePts}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>
          🎯 = Placares exatos (7 pts) · Grupos = Pontos em jogos da fase de
          grupos · Elim. = Pontos em jogos das eliminatórias
        </p>
        <p>
          Classificados: pontos por acertar quais times avançam em cada fase ·
          Pódio: pontos por acertar Campeão (25), Vice (20) e 3º (15)
        </p>
        <p>
          Desempate: 1º Pontos em jogos · 2º Pontos em classificados · 3º Pontos
          do pódio
        </p>
      </div>
    </>
  );
}
