"use client";

import { useState } from "react";
import { PHASE_LABELS } from "@/lib/scoring";

interface Team {
  id: string;
  name: string;
  code: string;
  groupLabel: string;
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
  teams: Team[];
  knockoutMatches: Match[];
}

const KNOCKOUT_PHASES = ["ROUND_32", "ROUND_16", "QUARTERS", "SEMIS", "THIRD_PLACE", "FINAL"];

export default function AdminPhases({ teams, knockoutMatches }: Props) {
  const [activePhase, setActivePhase] = useState("ROUND_32");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savingMatch, setSavingMatch] = useState<Record<string, boolean>>({});

  const phaseMatches = knockoutMatches.filter((m) => m.phase === activePhase);

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  }

  async function confirmQualified() {
    if (selectedTeams.size === 0) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: activePhase,
          qualifiedTeamIds: Array.from(selectedTeams),
        }),
      });

      if (res.ok) {
        alert("Classificados confirmados e pontos calculados!");
        setSelectedTeams(new Set());
      }
    } finally {
      setSaving(false);
    }
  }

  async function setMatchTeams(matchId: string, homeTeamId: string, awayTeamId: string) {
    if (!homeTeamId || !awayTeamId) return;
    setSavingMatch((prev) => ({ ...prev, [matchId]: true }));

    try {
      await fetch("/api/admin/phases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, homeTeamId, awayTeamId }),
      });
    } finally {
      setSavingMatch((prev) => ({ ...prev, [matchId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Phase tabs */}
      <div className="flex flex-wrap gap-2">
        {KNOCKOUT_PHASES.map((phase) => (
          <button
            key={phase}
            onClick={() => {
              setActivePhase(phase);
              setSelectedTeams(new Set());
            }}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activePhase === phase
                ? "bg-black text-white border-black"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {PHASE_LABELS[phase] || phase}
          </button>
        ))}
      </div>

      {/* Confirm qualified teams */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold mb-3">
          Confirmar Classificados - {PHASE_LABELS[activePhase]}
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Selecione as seleções que efetivamente classificaram para esta fase.
          Isso calculará os pontos de previsão de todos os participantes.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => toggleTeam(team.id)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                selectedTeams.has(team.id)
                  ? "bg-black text-white border-black"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              {team.code}
            </button>
          ))}
        </div>
        <button
          onClick={confirmQualified}
          disabled={saving || selectedTeams.size === 0}
          className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Salvando..." : `Confirmar ${selectedTeams.size} classificados`}
        </button>
      </div>

      {/* Set match matchups */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold mb-3">
          Confrontos - {PHASE_LABELS[activePhase]}
        </h2>
        <div className="space-y-3">
          {phaseMatches.map((match) => (
            <div key={match.id} className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-400 w-8">#{match.matchOrder}</span>
              <select
                defaultValue={match.homeTeam?.id || ""}
                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[120px]"
                id={`home-${match.id}`}
              >
                <option value="">Selecione mandante</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 text-sm">vs</span>
              <select
                defaultValue={match.awayTeam?.id || ""}
                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[120px]"
                id={`away-${match.id}`}
              >
                <option value="">Selecione visitante</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const homeEl = document.getElementById(`home-${match.id}`) as HTMLSelectElement;
                  const awayEl = document.getElementById(`away-${match.id}`) as HTMLSelectElement;
                  setMatchTeams(match.id, homeEl.value, awayEl.value);
                }}
                disabled={savingMatch[match.id]}
                className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {savingMatch[match.id] ? "..." : "Definir"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
