"use client";

import { useState } from "react";

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
}

interface Props {
  ranking: RankingEntry[];
  currentUserId: string;
}

export default function RankingTable({ ranking, currentUserId }: Props) {
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
                <th className="text-center px-3 py-2 font-medium border-l border-gray-200" title="Classificados 32avos de Final">
                  32avos
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
                <th className="text-center px-3 py-2 font-medium" title="Finalistas corretos">
                  Final.
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
                    <span className={i < 3 ? "font-bold" : "text-gray-400"}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={i < 3 ? "font-medium" : ""}>
                      {user.name}
                    </span>
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
                    <span className={`text-sm ${i < 3 ? "font-bold" : ""}`}>
                      {user.name}
                    </span>
                    {isMe && (
                      <span className="text-xs text-gray-400 ml-1">(você)</span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        🎯 {user.exactScores}
                      </span>
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
                      <span className="text-gray-500">32avos</span>
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
