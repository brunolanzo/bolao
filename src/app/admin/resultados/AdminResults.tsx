"use client";

import { useState } from "react";
import { PHASE_LABELS } from "@/lib/scoring";

interface Team {
  id: string;
  name: string;
  code: string;
}

interface Match {
  id: string;
  phase: string;
  groupLabel: string | null;
  matchOrder: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string;
  status: string;
}

interface Props {
  matches: Match[];
}

export default function AdminResults({ matches }: Props) {
  const [filter, setFilter] = useState("GROUP");
  const [scores, setScores] = useState<
    Record<string, { homeScore: string; awayScore: string }>
  >(() => {
    const initial: Record<string, { homeScore: string; awayScore: string }> = {};
    for (const m of matches) {
      initial[m.id] = {
        homeScore: m.homeScore !== null ? String(m.homeScore) : "",
        awayScore: m.awayScore !== null ? String(m.awayScore) : "",
      };
    }
    return initial;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const m of matches) {
      initial[m.id] = m.status;
    }
    return initial;
  });

  const filteredMatches = matches.filter((m) => m.phase === filter);
  const phases = [...new Set(matches.map((m) => m.phase))];

  async function saveResult(matchId: string) {
    const score = scores[matchId];
    if (!score.homeScore || !score.awayScore) return;

    setSaving((prev) => ({ ...prev, [matchId]: true }));

    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          homeScore: parseInt(score.homeScore),
          awayScore: parseInt(score.awayScore),
          status: statuses[matchId],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao salvar");
      }
    } finally {
      setSaving((prev) => ({ ...prev, [matchId]: false }));
    }
  }

  return (
    <div>
      {/* Phase filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {phases.map((phase) => (
          <button
            key={phase}
            onClick={() => setFilter(phase)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              filter === phase
                ? "bg-black text-white border-black"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {PHASE_LABELS[phase] || phase}
          </button>
        ))}
      </div>

      {/* Matches list */}
      <div className="space-y-3">
        {filteredMatches.map((match) => {
          const score = scores[match.id];
          const dateStr = new Date(match.matchDate).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={match.id}
              className={`border rounded-lg p-4 ${
                statuses[match.id] === "FINISHED"
                  ? "border-green-200 bg-green-50"
                  : statuses[match.id] === "LIVE"
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-400 w-24">
                  #{match.matchOrder} - {dateStr}
                </span>

                <span className="font-medium text-right min-w-[100px]">
                  {match.homeTeam?.name || "TBD"}
                </span>

                <input
                  type="number"
                  min={0}
                  value={score?.homeScore ?? ""}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [match.id]: { ...prev[match.id], homeScore: e.target.value },
                    }))
                  }
                  className="w-12 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
                <span className="text-gray-400">x</span>
                <input
                  type="number"
                  min={0}
                  value={score?.awayScore ?? ""}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [match.id]: { ...prev[match.id], awayScore: e.target.value },
                    }))
                  }
                  className="w-12 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />

                <span className="font-medium min-w-[100px]">
                  {match.awayTeam?.name || "TBD"}
                </span>

                <select
                  value={statuses[match.id]}
                  onChange={(e) =>
                    setStatuses((prev) => ({ ...prev, [match.id]: e.target.value }))
                  }
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="SCHEDULED">Agendado</option>
                  <option value="LIVE">Ao Vivo</option>
                  <option value="FINISHED">Finalizado</option>
                </select>

                <button
                  onClick={() => saveResult(match.id)}
                  disabled={saving[match.id]}
                  className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-50 ml-auto"
                >
                  {saving[match.id] ? "..." : "Salvar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
