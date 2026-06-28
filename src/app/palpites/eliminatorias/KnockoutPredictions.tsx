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

export default function KnockoutPredictions({
  matches,
  initialPredictions,
}: Props) {
  const [predictions, setPredictions] = useState(initialPredictions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();

  // Each knockout match locks at its own kickoff — or as soon as it's live /
  // finished (covers a real kickoff earlier than the stored placeholder time).
  function isMatchLocked(match: Match): boolean {
    if (match.status === "LIVE" || match.status === "FINISHED") return true;
    return now > new Date(match.matchDate);
  }

  function formatKickoff(matchDate: string): string {
    return new Date(matchDate).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function updatePrediction(
    matchId: string,
    field: "homeScore" | "awayScore",
    value: string,
  ) {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        homeScore:
          field === "homeScore" ? numValue : (prev[matchId]?.homeScore ?? 0),
        awayScore:
          field === "awayScore" ? numValue : (prev[matchId]?.awayScore ?? 0),
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    // Only submit predictions for matches that haven't kicked off yet
    const preds = matches
      .filter((m) => predictions[m.id] && !isMatchLocked(m))
      .map((m) => ({
        matchId: m.id,
        homeScore: predictions[m.id].homeScore,
        awayScore: predictions[m.id].awayScore,
      }));

    if (preds.length === 0) {
      setError("Nenhum palpite editável para salvar.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions: preds }),
      });

      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || "Erro ao salvar palpites");
      }
    } catch {
      setError("Erro ao salvar palpites");
    } finally {
      setSaving(false);
    }
  }

  // Group by phase, in canonical order
  const phaseOrder = [
    "ROUND_32",
    "ROUND_16",
    "QUARTERS",
    "SEMIS",
    "THIRD_PLACE",
    "FINAL",
  ];
  const phasesPresent = phaseOrder.filter((p) =>
    matches.some((m) => m.phase === p),
  );

  // Determine if there's anything editable
  const hasEditableMatch = matches.some((m) => !isMatchLocked(m));

  return (
    <div className="space-y-6">
      {phasesPresent.map((phase) => {
        const phaseMatches = matches.filter((m) => m.phase === phase);
        const allLocked = phaseMatches.every((m) => isMatchLocked(m));

        return (
          <div
            key={phase}
            className={`border rounded-lg p-4 ${
              allLocked ? "border-gray-200 bg-gray-50" : "border-green-200"
            }`}
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <h2 className="font-bold">{PHASE_LABELS[phase] || phase}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Cada jogo encerra no seu próprio início.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {phaseMatches.map((match) => {
                const pred = predictions[match.id];
                const dateStr = new Date(match.matchDate).toLocaleDateString(
                  "pt-BR",
                  { day: "2-digit", month: "2-digit" },
                );
                const isFinished = match.status === "FINISHED";
                const locked = isMatchLocked(match);

                return (
                  <div key={match.id}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 text-xs w-10">
                        {dateStr}
                      </span>
                      <span className="flex-1 text-right truncate">
                        {match.homeTeam?.name || "TBD"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={pred?.homeScore ?? ""}
                        onChange={(e) =>
                          updatePrediction(
                            match.id,
                            "homeScore",
                            e.target.value,
                          )
                        }
                        disabled={locked}
                        className="w-10 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] disabled:bg-gray-100 disabled:opacity-60"
                      />
                      <span className="text-gray-400">x</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={pred?.awayScore ?? ""}
                        onChange={(e) =>
                          updatePrediction(
                            match.id,
                            "awayScore",
                            e.target.value,
                          )
                        }
                        disabled={locked}
                        className="w-10 h-8 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B] disabled:bg-gray-100 disabled:opacity-60"
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
                    <p className="text-[10px] text-gray-400 mt-0.5 pl-12">
                      {isFinished
                        ? "Encerrado"
                        : locked
                          ? "🔒 Jogo já começou — palpites encerrados"
                          : `Aberto até ${formatKickoff(match.matchDate)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {hasEditableMatch && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-[#009C3B] text-white hover:bg-[#006B2B]"
            } disabled:opacity-50`}
          >
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Palpites"}
          </button>
        </div>
      )}
    </div>
  );
}
