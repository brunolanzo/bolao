"use client";

import { useState } from "react";

interface Team {
  id: string;
  name: string;
  code: string;
  groupLabel: string;
}

interface PhasePrediction {
  id: string;
  teamId: string;
  phase: string;
  team: Team;
}

interface ChampionPrediction {
  championTeamId: string;
  runnerUpTeamId: string;
  thirdPlaceTeamId: string;
}

interface Props {
  teams: Team[];
  initialPhasePredictions: PhasePrediction[];
  initialChampionPrediction: ChampionPrediction | null;
  isLocked: boolean;
  deadline: string | null;
}

const PHASES = [
  { key: "ROUND_16", label: "Oitavas de Final", count: 16 },
  { key: "QUARTERS", label: "Quartas de Final", count: 8 },
  { key: "SEMIS", label: "Semifinais", count: 4 },
  { key: "FINAL", label: "Finalistas", count: 2 },
];

export default function ClassificationPredictions({
  teams,
  initialPhasePredictions,
  initialChampionPrediction,
  isLocked,
  deadline,
}: Props) {
  // Build initial state from existing predictions
  const buildInitialSelections = () => {
    const sel: Record<string, Set<string>> = {};
    for (const phase of PHASES) {
      sel[phase.key] = new Set<string>();
    }
    for (const pred of initialPhasePredictions) {
      if (sel[pred.phase]) {
        sel[pred.phase].add(pred.teamId);
      }
    }
    return sel;
  };

  const [selections, setSelections] = useState(buildInitialSelections);
  const [champion, setChampion] = useState(initialChampionPrediction?.championTeamId || "");
  const [runnerUp, setRunnerUp] = useState(initialChampionPrediction?.runnerUpTeamId || "");
  const [thirdPlace, setThirdPlace] = useState(initialChampionPrediction?.thirdPlaceTeamId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleTeam(phase: string, teamId: string, maxCount: number) {
    setSelections((prev) => {
      const newSet = new Set(prev[phase]);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else if (newSet.size < maxCount) {
        newSet.add(teamId);
      }
      return { ...prev, [phase]: newSet };
    });
  }

  // Get available teams for each phase (based on previous phase selections)
  function getAvailableTeams(phaseIndex: number): Team[] {
    if (phaseIndex === 0) return teams; // All teams for round of 16
    const prevPhase = PHASES[phaseIndex - 1];
    return teams.filter((t) => selections[prevPhase.key].has(t.id));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const phasePredictions: { teamId: string; phase: string }[] = [];
    for (const phase of PHASES) {
      for (const teamId of selections[phase.key]) {
        phasePredictions.push({ teamId, phase: phase.key });
      }
    }

    const championPrediction =
      champion && runnerUp && thirdPlace
        ? {
            championTeamId: champion,
            runnerUpTeamId: runnerUp,
            thirdPlaceTeamId: thirdPlace,
          }
        : undefined;

    try {
      const res = await fetch("/api/phase-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phasePredictions, championPrediction }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  // Teams available for champion/runner-up/third selection (from finalists)
  const finalistTeams = teams.filter((t) => selections.FINAL.has(t.id));
  // Third place candidates: semifinalists who are NOT in the final
  const thirdPlaceTeams = teams.filter(
    (t) => selections.SEMIS.has(t.id) && !selections.FINAL.has(t.id)
  );

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
    <div className="space-y-8">
      {/* Deadline banner */}
      {deadlineStr && !isLocked && (
        <div className="border border-green-200 rounded-lg px-4 py-3 bg-green-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#009C3B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            <span className="text-gray-500">Data limite para previsões:</span>{" "}
            <span className="font-medium">{deadlineStr}</span>
          </p>
        </div>
      )}

      {PHASES.map((phase, phaseIndex) => {
        const available = getAvailableTeams(phaseIndex);
        const selected = selections[phase.key];

        return (
          <div key={phase.key} className="border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">{phase.label}</h2>
              <span className="text-sm text-gray-400">
                {selected.size}/{phase.count} selecionadas
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {available.map((team) => {
                const isSelected = selected.has(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => toggleTeam(phase.key, team.id, phase.count)}
                    disabled={isLocked}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      isSelected
                        ? "bg-[#009C3B] text-white border-[#009C3B]"
                        : "border-gray-300 hover:border-[#009C3B]"
                    } disabled:opacity-50`}
                  >
                    {team.code}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Champion / Runner-up / Third Place */}
      <div className="border border-green-200 rounded-lg p-4">
        <h2 className="font-bold mb-3">Campeão, Vice e 3º Lugar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Campeão (25 pts)</label>
            <select
              value={champion}
              onChange={(e) => setChampion(e.target.value)}
              disabled={isLocked}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B]"
            >
              <option value="">Selecione</option>
              {finalistTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Vice (20 pts)</label>
            <select
              value={runnerUp}
              onChange={(e) => setRunnerUp(e.target.value)}
              disabled={isLocked}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B]"
            >
              <option value="">Selecione</option>
              {finalistTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">3º Lugar (15 pts)</label>
            <select
              value={thirdPlace}
              onChange={(e) => setThirdPlace(e.target.value)}
              disabled={isLocked}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B]"
            >
              <option value="">Selecione</option>
              {thirdPlaceTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!isLocked && (
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
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar Previsões"}
          </button>
        </div>
      )}
    </div>
  );
}
