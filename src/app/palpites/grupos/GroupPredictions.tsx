"use client";

import { useState } from "react";

interface Team {
  id: string;
  name: string;
  code: string;
  groupLabel: string;
}

interface Match {
  id: string;
  phase: string;
  groupLabel: string | null;
  matchOrder: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  matchDate: string;
  status: string;
}

interface PredictionValue {
  homeScore: number | null;
  awayScore: number | null;
}

interface Props {
  groups: Record<string, Match[]>;
  initialPredictions: Record<string, { homeScore: number; awayScore: number }>;
  isLocked: boolean;
  deadline: string | null;
}

function computeStandings(
  matches: Match[],
  predictions: Record<string, PredictionValue>
) {
  const stats: Record<
    string,
    { team: Team; pts: number; gf: number; gc: number; gd: number; w: number; d: number; l: number }
  > = {};

  // Initialize all teams in the group
  for (const match of matches) {
    if (match.homeTeam && !stats[match.homeTeam.id]) {
      stats[match.homeTeam.id] = {
        team: match.homeTeam,
        pts: 0, gf: 0, gc: 0, gd: 0, w: 0, d: 0, l: 0,
      };
    }
    if (match.awayTeam && !stats[match.awayTeam.id]) {
      stats[match.awayTeam.id] = {
        team: match.awayTeam,
        pts: 0, gf: 0, gc: 0, gd: 0, w: 0, d: 0, l: 0,
      };
    }
  }

  // Calculate based on user predictions
  for (const match of matches) {
    const pred = predictions[match.id];
    if (!pred || pred.homeScore === null || pred.awayScore === null || !match.homeTeam || !match.awayTeam) continue;

    const home = stats[match.homeTeam.id];
    const away = stats[match.awayTeam.id];

    home.gf += pred.homeScore;
    home.gc += pred.awayScore;
    away.gf += pred.awayScore;
    away.gc += pred.homeScore;

    if (pred.homeScore > pred.awayScore) {
      home.pts += 3;
      home.w += 1;
      away.l += 1;
    } else if (pred.homeScore < pred.awayScore) {
      away.pts += 3;
      away.w += 1;
      home.l += 1;
    } else {
      home.pts += 1;
      away.pts += 1;
      home.d += 1;
      away.d += 1;
    }
  }

  // Calculate GD and sort
  const sorted = Object.values(stats)
    .map((s) => ({ ...s, gd: s.gf - s.gc }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  return sorted;
}

export default function GroupPredictions({ groups, initialPredictions, isLocked, deadline }: Props) {
  const [predictions, setPredictions] = useState<Record<string, PredictionValue>>(() => {
    const mapped: Record<string, PredictionValue> = {};
    for (const [matchId, pred] of Object.entries(initialPredictions)) {
      mapped[matchId] = { homeScore: pred.homeScore, awayScore: pred.awayScore };
    }
    return mapped;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  function updatePrediction(matchId: string, field: "homeScore" | "awayScore", value: string) {
    if (value === "") {
      // Allow clearing the field
      setPredictions((prev) => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          homeScore: field === "homeScore" ? null : (prev[matchId]?.homeScore ?? null),
          awayScore: field === "awayScore" ? null : (prev[matchId]?.awayScore ?? null),
        },
      }));
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        homeScore: field === "homeScore" ? numValue : (prev[matchId]?.homeScore ?? null),
        awayScore: field === "awayScore" ? numValue : (prev[matchId]?.awayScore ?? null),
      },
    }));
  }

  async function saveGroup(groupLabel: string) {
    setSaving((prev) => ({ ...prev, [groupLabel]: true }));
    setSaved((prev) => ({ ...prev, [groupLabel]: false }));

    const groupMatches = groups[groupLabel];
    const groupPredictions = groupMatches
      .filter((m) => predictions[m.id] && predictions[m.id].homeScore !== null && predictions[m.id].awayScore !== null)
      .map((m) => ({
        matchId: m.id,
        homeScore: predictions[m.id].homeScore as number,
        awayScore: predictions[m.id].awayScore as number,
      }));

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions: groupPredictions }),
      });

      if (res.ok) {
        setSaved((prev) => ({ ...prev, [groupLabel]: true }));
        setTimeout(() => setSaved((prev) => ({ ...prev, [groupLabel]: false })), 2000);
      }
    } finally {
      setSaving((prev) => ({ ...prev, [groupLabel]: false }));
    }
  }

  const groupLabels = Object.keys(groups).sort();

  // Format deadline for display
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      {/* Deadline banner */}
      {deadlineStr && !isLocked && (
        <div className="mb-6 border border-green-200 rounded-lg px-4 py-3 bg-green-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#009C3B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            <span className="text-gray-500">Data limite para palpites:</span>{" "}
            <span className="font-medium">{deadlineStr}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupLabels.map((groupLabel) => {
          const matches = groups[groupLabel];
          const standings = computeStandings(matches, predictions);
          const allFilled = matches.every(
            (m) => predictions[m.id] && predictions[m.id].homeScore !== null && predictions[m.id].awayScore !== null
          );

          return (
            <div key={groupLabel} className="border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Grupo {groupLabel}</h2>
                {!isLocked && (
                  <button
                    onClick={() => saveGroup(groupLabel)}
                    disabled={saving[groupLabel]}
                    className={`text-sm px-3 py-1 rounded-md transition-colors ${
                      saved[groupLabel]
                        ? "bg-green-100 text-green-700"
                        : "bg-[#009C3B] text-white hover:bg-[#006B2B]"
                    } disabled:opacity-50`}
                  >
                    {saving[groupLabel]
                      ? "Salvando..."
                      : saved[groupLabel]
                      ? "Salvo!"
                      : "Salvar"}
                  </button>
                )}
              </div>

              {/* Matches */}
              <div className="space-y-2 mb-4">
                {matches.map((match) => {
                  const pred = predictions[match.id];
                  const dateStr = new Date(match.matchDate).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  });

                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-gray-400 text-xs w-10">{dateStr}</span>
                      <span className="flex-1 text-right truncate">
                        {match.homeTeam?.name || "TBD"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={pred?.homeScore ?? ""}
                        onChange={(e) => updatePrediction(match.id, "homeScore", e.target.value)}
                        disabled={isLocked}
                        className="w-10 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] disabled:bg-gray-100"
                      />
                      <span className="text-gray-400">x</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={pred?.awayScore ?? ""}
                        onChange={(e) => updatePrediction(match.id, "awayScore", e.target.value)}
                        disabled={isLocked}
                        className="w-10 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] disabled:bg-gray-100"
                      />
                      <span className="flex-1 truncate">
                        {match.awayTeam?.name || "TBD"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Standings based on predictions */}
              {allFilled && standings.length > 0 && (
                <div className="border-t border-green-100 pt-3">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                    Classificação (seus palpites)
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left py-1">#</th>
                        <th className="text-left py-1">Seleção</th>
                        <th className="text-center py-1">J</th>
                        <th className="text-center py-1">V</th>
                        <th className="text-center py-1">E</th>
                        <th className="text-center py-1">D</th>
                        <th className="text-center py-1">SG</th>
                        <th className="text-center py-1 font-bold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr
                          key={s.team.id}
                          className={i < 2 ? "font-medium" : "text-gray-500"}
                        >
                          <td className="py-0.5">{i + 1}</td>
                          <td className="py-0.5">{s.team.code}</td>
                          <td className="text-center py-0.5">{s.w + s.d + s.l}</td>
                          <td className="text-center py-0.5">{s.w}</td>
                          <td className="text-center py-0.5">{s.d}</td>
                          <td className="text-center py-0.5">{s.l}</td>
                          <td className="text-center py-0.5">{s.gd > 0 ? `+${s.gd}` : s.gd}</td>
                          <td className="text-center py-0.5 font-bold">{s.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 mt-1">
                    Top 2 classificados + melhores 3ºs
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
