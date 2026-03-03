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
  initialPredictions: Record<string, { homeScore: number; awayScore: number }>;
}

export default function KnockoutPredictions({ matches, initialPredictions }: Props) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updatePrediction(matchId: string, field: "homeScore" | "awayScore", value: string) {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        homeScore: field === "homeScore" ? numValue : (prev[matchId]?.homeScore ?? 0),
        awayScore: field === "awayScore" ? numValue : (prev[matchId]?.awayScore ?? 0),
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const preds = matches
      .filter((m) => predictions[m.id])
      .map((m) => ({
        matchId: m.id,
        homeScore: predictions[m.id].homeScore,
        awayScore: predictions[m.id].awayScore,
      }));

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions: preds }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  // Group by phase
  const phases = [...new Set(matches.map((m) => m.phase))];

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const phaseMatches = matches.filter((m) => m.phase === phase);

        return (
          <div key={phase} className="border border-gray-200 rounded-lg p-4">
            <h2 className="font-bold mb-3">{PHASE_LABELS[phase] || phase}</h2>
            <div className="space-y-2">
              {phaseMatches.map((match) => {
                const pred = predictions[match.id];
                const dateStr = new Date(match.matchDate).toLocaleDateString(
                  "pt-BR",
                  { day: "2-digit", month: "2-digit" }
                );
                const isFinished = match.status === "FINISHED";

                return (
                  <div key={match.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 text-xs w-10">{dateStr}</span>
                    <span className="flex-1 text-right truncate">
                      {match.homeTeam?.name || "TBD"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={pred?.homeScore ?? ""}
                      onChange={(e) =>
                        updatePrediction(match.id, "homeScore", e.target.value)
                      }
                      disabled={isFinished}
                      className="w-10 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100"
                    />
                    <span className="text-gray-400">x</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={pred?.awayScore ?? ""}
                      onChange={(e) =>
                        updatePrediction(match.id, "awayScore", e.target.value)
                      }
                      disabled={isFinished}
                      className="w-10 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black disabled:bg-gray-100"
                    />
                    <span className="flex-1 truncate">
                      {match.awayTeam?.name || "TBD"}
                    </span>
                    {isFinished && (
                      <span className="text-xs text-gray-400">
                        ({match.homeScore} x {match.awayScore})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
            saved
              ? "bg-green-100 text-green-700"
              : "bg-black text-white hover:bg-gray-800"
          } disabled:opacity-50`}
        >
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Palpites"}
        </button>
      </div>
    </div>
  );
}
