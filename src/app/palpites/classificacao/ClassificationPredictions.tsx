"use client";

import { useState, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  code: string;
  groupLabel: string;
}

interface GroupPick {
  first: string | null;
  second: string | null;
  third: string | null;
}

type GroupPicks = Record<string, GroupPick>;
type BracketPicks = Record<string, string | null>; // matchId → winner teamId
type ThirdSlots = Record<string, string | null>;   // matchId → teamId in 3rd-place slot

interface BracketState {
  groupPicks: GroupPicks;
  qualifiedThirds: string[];
  thirdSlots: ThirdSlots;
  bracketPicks: BracketPicks;
}

interface Props {
  teams: Team[];
  initialBracketState: Partial<BracketState>;
  isLocked: boolean;
  deadline: string | null;
}

// ─── Bracket structure (official Copa do Mundo 2026) ─────────────────────────

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

type FixedSlot   = { kind: "group"; pos: "1st" | "2nd"; group: string };
type ThirdSlotT  = { kind: "3rd"; eligible: string[] };
type PrevSlot    = { kind: "prev"; matchId: string };
type LoserSlot   = { kind: "loser"; matchId: string };
type Slot        = FixedSlot | ThirdSlotT | PrevSlot | LoserSlot;

interface BracketMatch {
  id: string;
  label: string;
  phase: string;
  slotA: Slot;
  slotB: Slot;
}

const R32: BracketMatch[] = [
  { id: "M73", label: "Jogo 73", phase: "ROUND_32", slotA: { kind: "group", pos: "2nd", group: "A" }, slotB: { kind: "group", pos: "2nd", group: "B" } },
  { id: "M74", label: "Jogo 74", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "E" }, slotB: { kind: "3rd", eligible: ["A","B","C","D","F"] } },
  { id: "M75", label: "Jogo 75", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "F" }, slotB: { kind: "group", pos: "2nd", group: "C" } },
  { id: "M76", label: "Jogo 76", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "C" }, slotB: { kind: "group", pos: "2nd", group: "F" } },
  { id: "M77", label: "Jogo 77", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "I" }, slotB: { kind: "3rd", eligible: ["C","D","F","G","H"] } },
  { id: "M78", label: "Jogo 78", phase: "ROUND_32", slotA: { kind: "group", pos: "2nd", group: "E" }, slotB: { kind: "group", pos: "2nd", group: "I" } },
  { id: "M79", label: "Jogo 79", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "A" }, slotB: { kind: "3rd", eligible: ["C","E","F","H","I"] } },
  { id: "M80", label: "Jogo 80", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "L" }, slotB: { kind: "3rd", eligible: ["E","H","I","J","K"] } },
  { id: "M81", label: "Jogo 81", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "D" }, slotB: { kind: "3rd", eligible: ["B","E","F","I","J"] } },
  { id: "M82", label: "Jogo 82", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "G" }, slotB: { kind: "3rd", eligible: ["A","E","H","I","J"] } },
  { id: "M83", label: "Jogo 83", phase: "ROUND_32", slotA: { kind: "group", pos: "2nd", group: "K" }, slotB: { kind: "group", pos: "2nd", group: "L" } },
  { id: "M84", label: "Jogo 84", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "H" }, slotB: { kind: "group", pos: "2nd", group: "J" } },
  { id: "M85", label: "Jogo 85", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "B" }, slotB: { kind: "3rd", eligible: ["E","F","G","I","J"] } },
  { id: "M86", label: "Jogo 86", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "J" }, slotB: { kind: "group", pos: "2nd", group: "H" } },
  { id: "M87", label: "Jogo 87", phase: "ROUND_32", slotA: { kind: "group", pos: "1st", group: "K" }, slotB: { kind: "3rd", eligible: ["D","E","I","J","L"] } },
  { id: "M88", label: "Jogo 88", phase: "ROUND_32", slotA: { kind: "group", pos: "2nd", group: "D" }, slotB: { kind: "group", pos: "2nd", group: "G" } },
];

const R16: BracketMatch[] = [
  { id: "M89", label: "Oitavas 1", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M74" }, slotB: { kind: "prev", matchId: "M77" } },
  { id: "M90", label: "Oitavas 2", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M73" }, slotB: { kind: "prev", matchId: "M75" } },
  { id: "M91", label: "Oitavas 3", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M76" }, slotB: { kind: "prev", matchId: "M78" } },
  { id: "M92", label: "Oitavas 4", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M79" }, slotB: { kind: "prev", matchId: "M80" } },
  { id: "M93", label: "Oitavas 5", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M83" }, slotB: { kind: "prev", matchId: "M84" } },
  { id: "M94", label: "Oitavas 6", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M81" }, slotB: { kind: "prev", matchId: "M82" } },
  { id: "M95", label: "Oitavas 7", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M86" }, slotB: { kind: "prev", matchId: "M88" } },
  { id: "M96", label: "Oitavas 8", phase: "ROUND_16", slotA: { kind: "prev", matchId: "M85" }, slotB: { kind: "prev", matchId: "M87" } },
];

const QF: BracketMatch[] = [
  { id: "QF1", label: "Quartas 1", phase: "QUARTERS", slotA: { kind: "prev", matchId: "M89" }, slotB: { kind: "prev", matchId: "M90" } },
  { id: "QF2", label: "Quartas 2", phase: "QUARTERS", slotA: { kind: "prev", matchId: "M91" }, slotB: { kind: "prev", matchId: "M92" } },
  { id: "QF3", label: "Quartas 3", phase: "QUARTERS", slotA: { kind: "prev", matchId: "M93" }, slotB: { kind: "prev", matchId: "M94" } },
  { id: "QF4", label: "Quartas 4", phase: "QUARTERS", slotA: { kind: "prev", matchId: "M95" }, slotB: { kind: "prev", matchId: "M96" } },
];

const SF: BracketMatch[] = [
  { id: "SF1", label: "Semifinal 1", phase: "SEMIS", slotA: { kind: "prev", matchId: "QF1" }, slotB: { kind: "prev", matchId: "QF2" } },
  { id: "SF2", label: "Semifinal 2", phase: "SEMIS", slotA: { kind: "prev", matchId: "QF3" }, slotB: { kind: "prev", matchId: "QF4" } },
];

const FIN: BracketMatch = {
  id: "FIN", label: "Final", phase: "FINAL",
  slotA: { kind: "prev", matchId: "SF1" },
  slotB: { kind: "prev", matchId: "SF2" },
};

const THIRD_PLACE: BracketMatch = {
  id: "3P", label: "3º e 4º Lugar", phase: "THIRD_PLACE",
  slotA: { kind: "loser", matchId: "SF1" },
  slotB: { kind: "loser", matchId: "SF2" },
};

const ALL_MATCHES = [...R32, ...R16, ...QF, ...SF, FIN, THIRD_PLACE];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveSlot(
  slot: Slot,
  matchId: string,
  groupPicks: GroupPicks,
  thirdSlots: ThirdSlots,
  bracketPicks: BracketPicks,
): string | null {
  if (slot.kind === "group") {
    const gp = groupPicks[slot.group];
    if (!gp) return null;
    return slot.pos === "1st" ? gp.first : gp.second;
  }
  if (slot.kind === "3rd") {
    return thirdSlots[matchId] ?? null;
  }
  if (slot.kind === "prev") {
    return bracketPicks[slot.matchId] ?? null;
  }
  if (slot.kind === "loser") {
    const m = ALL_MATCHES.find((x) => x.id === slot.matchId);
    if (!m) return null;
    const winner = bracketPicks[slot.matchId];
    if (!winner) return null;
    const tA = resolveSlot(m.slotA, m.id, groupPicks, thirdSlots, bracketPicks);
    const tB = resolveSlot(m.slotB, m.id, groupPicks, thirdSlots, bracketPicks);
    if (tA === winner) return tB;
    if (tB === winner) return tA;
    return null;
  }
  return null;
}

function slotLabel(slot: Slot): string {
  if (slot.kind === "group") return `${slot.pos === "1st" ? "1º" : "2º"} Gr. ${slot.group}`;
  if (slot.kind === "3rd") return `3º (${slot.eligible.join("/")})`;
  if (slot.kind === "prev" || slot.kind === "loser") return "…";
  return "?";
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClassificationPredictions({
  teams,
  initialBracketState,
  isLocked,
  deadline,
}: Props) {
  const [tab, setTab] = useState<"groups" | "bracket">("groups");

  // State
  const [groupPicks, setGroupPicks] = useState<GroupPicks>(
    initialBracketState.groupPicks ?? {},
  );
  const [qualifiedThirds, setQualifiedThirds] = useState<Set<string>>(
    new Set(initialBracketState.qualifiedThirds ?? []),
  );
  const [thirdSlots, setThirdSlots] = useState<ThirdSlots>(
    initialBracketState.thirdSlots ?? {},
  );
  const [bracketPicks, setBracketPicks] = useState<BracketPicks>(
    initialBracketState.bracketPicks ?? {},
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived maps
  const teamById = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  );
  const teamsByGroup = useMemo(() => {
    const map: Record<string, Team[]> = {};
    for (const t of teams) {
      if (!map[t.groupLabel]) map[t.groupLabel] = [];
      map[t.groupLabel].push(t);
    }
    return map;
  }, [teams]);

  // 3rd place teams derived from groupPicks (first remaining alphabetically if not explicit)
  const thirdsByGroup = useMemo(() => {
    const result: Record<string, Team | null> = {};
    for (const g of GROUPS) {
      const gp = groupPicks[g];
      const grpTeams = teamsByGroup[g] ?? [];
      const taken = new Set([gp?.first, gp?.second].filter(Boolean));
      if (gp?.third) {
        result[g] = teamById.get(gp.third) ?? null;
      } else {
        const remaining = grpTeams.filter((t) => !taken.has(t.id));
        result[g] = remaining[0] ?? null;
      }
    }
    return result;
  }, [groupPicks, teamsByGroup, teamById]);

  // Resolve slot helper bound to current state
  const resolve = (slot: Slot, matchId: string) =>
    resolveSlot(slot, matchId, groupPicks, thirdSlots, bracketPicks);

  // ─── Group picks ────────────────────────────────────────────────────────────

  function clickTeamInGroup(group: string, teamId: string) {
    if (isLocked) return;
    setGroupPicks((prev) => {
      const gp = prev[group] ?? { first: null, second: null, third: null };

      if (gp.first === teamId) {
        // Deselect 1st → shift up
        return { ...prev, [group]: { first: gp.second, second: gp.third, third: null } };
      }
      if (gp.second === teamId) {
        return { ...prev, [group]: { first: gp.first, second: gp.third, third: null } };
      }
      if (gp.third === teamId) {
        return { ...prev, [group]: { first: gp.first, second: gp.second, third: null } };
      }
      // Assign to next available position
      if (!gp.first) return { ...prev, [group]: { ...gp, first: teamId } };
      if (!gp.second) return { ...prev, [group]: { ...gp, second: teamId } };
      if (!gp.third) return { ...prev, [group]: { ...gp, third: teamId } };
      return prev; // all 3 taken, ignore
    });
  }

  // ─── Qualified thirds ───────────────────────────────────────────────────────

  function toggleQualifiedThird(teamId: string) {
    if (isLocked) return;
    setQualifiedThirds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
        // Clear any thirdSlot that used this team
        setThirdSlots((ts) => {
          const updated = { ...ts };
          for (const k of Object.keys(updated)) {
            if (updated[k] === teamId) updated[k] = null;
          }
          return updated;
        });
      } else if (next.size < 8) {
        next.add(teamId);
      }
      return next;
    });
  }

  // ─── Third-slot assignment ───────────────────────────────────────────────────

  function assignThirdSlot(matchId: string, teamId: string) {
    if (isLocked) return;
    setThirdSlots((prev) => {
      const next = { ...prev };
      // Remove this team from any other slot
      for (const k of Object.keys(next)) {
        if (next[k] === teamId && k !== matchId) next[k] = null;
      }
      next[matchId] = teamId || null;
      return next;
    });
  }

  // ─── Bracket picks ───────────────────────────────────────────────────────────

  function pickWinner(matchId: string, teamId: string) {
    if (isLocked) return;
    setBracketPicks((prev) => ({
      ...prev,
      [matchId]: prev[matchId] === teamId ? null : teamId,
    }));
  }

  // ─── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    // Build PhasePredictions from bracket state
    const phasePredictions: { teamId: string; phase: string }[] = [];

    // ROUND_32: all 1sts + all 2nds + qualified thirds
    for (const g of GROUPS) {
      const gp = groupPicks[g];
      if (gp?.first) phasePredictions.push({ teamId: gp.first, phase: "ROUND_32" });
      if (gp?.second) phasePredictions.push({ teamId: gp.second, phase: "ROUND_32" });
    }
    for (const t of qualifiedThirds) {
      phasePredictions.push({ teamId: t, phase: "ROUND_32" });
    }

    // ROUND_16: R32 winners
    for (const m of R32) {
      const w = bracketPicks[m.id];
      if (w) phasePredictions.push({ teamId: w, phase: "ROUND_16" });
    }
    // QUARTERS: R16 winners
    for (const m of R16) {
      const w = bracketPicks[m.id];
      if (w) phasePredictions.push({ teamId: w, phase: "QUARTERS" });
    }
    // SEMIS: QF winners
    for (const m of QF) {
      const w = bracketPicks[m.id];
      if (w) phasePredictions.push({ teamId: w, phase: "SEMIS" });
    }
    // FINAL: SF winners
    for (const m of SF) {
      const w = bracketPicks[m.id];
      if (w) phasePredictions.push({ teamId: w, phase: "FINAL" });
    }

    // Champion prediction
    const finalWinner = bracketPicks["FIN"];
    const tA = resolve(FIN.slotA, FIN.id);
    const tB = resolve(FIN.slotB, FIN.id);
    const finalLoser = finalWinner === tA ? tB : finalWinner === tB ? tA : null;
    const thirdWinner = bracketPicks["3P"];
    const championPrediction =
      finalWinner && finalLoser && thirdWinner
        ? { championTeamId: finalWinner, runnerUpTeamId: finalLoser, thirdPlaceTeamId: thirdWinner }
        : undefined;

    const bracketState: BracketState = {
      groupPicks,
      qualifiedThirds: Array.from(qualifiedThirds),
      thirdSlots,
      bracketPicks,
    };

    try {
      const res = await fetch("/api/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bracketState, phasePredictions, championPrediction }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.error ?? "Erro ao salvar");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  // ─── UI helpers ──────────────────────────────────────────────────────────────

  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  // Progress counts
  const groupsDone = GROUPS.filter((g) => {
    const gp = groupPicks[g];
    return gp?.first && gp?.second;
  }).length;
  const thirdsDone = qualifiedThirds.size;
  const r32Done = R32.filter((m) => bracketPicks[m.id]).length;

  // ─── Match card component (inline) ──────────────────────────────────────────

  function MatchCard({ match, small = false }: { match: BracketMatch; small?: boolean }) {
    const idA = resolve(match.slotA, match.id);
    const idB = resolve(match.slotB, match.id);
    const teamA = idA ? teamById.get(idA) : null;
    const teamB = idB ? teamById.get(idB) : null;
    const winner = bracketPicks[match.id];
    // Validate: winner must still be one of the two teams
    const validWinner = winner && (winner === idA || winner === idB) ? winner : null;

    const thirdSlot = match.slotA.kind === "3rd"
      ? (match.slotA as ThirdSlotT)
      : match.slotB.kind === "3rd" ? (match.slotB as ThirdSlotT) : null;

    // Eligible thirds for this match (from qualified pool)
    const eligibleThirds = thirdSlot
      ? Array.from(qualifiedThirds)
          .map((id) => teamById.get(id))
          .filter((t): t is Team => !!t && thirdSlot.eligible.includes(t.groupLabel))
          // Also don't show if already assigned to another slot
          .filter((t) => {
            const assignedMatch = Object.entries(thirdSlots).find(
              ([mid, tid]) => tid === t.id && mid !== match.id,
            );
            return !assignedMatch;
          })
      : [];

    const btnBase = `px-2.5 py-1.5 rounded text-xs font-medium border transition-colors truncate max-w-[80px] ${small ? "text-[11px] px-2 py-1 max-w-[70px]" : ""}`;
    const btnActive = "bg-[#009C3B] text-white border-[#009C3B]";
    const btnIdle = "border-gray-300 bg-white hover:border-[#009C3B]";
    const btnEmpty = "border-dashed border-gray-200 bg-gray-50 text-gray-300 cursor-default";

    return (
      <div className="border border-gray-200 rounded-lg p-2.5 bg-white text-xs space-y-2">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{match.label}</div>

        {/* 3rd-place slot selector */}
        {thirdSlot && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 shrink-0">3º ({thirdSlot.eligible.join("/")})</span>
            <select
              value={thirdSlots[match.id] ?? ""}
              onChange={(e) => assignThirdSlot(match.id, e.target.value)}
              disabled={isLocked}
              className="flex-1 text-[11px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#009C3B] disabled:opacity-50 disabled:bg-gray-100"
            >
              <option value="">— selecione —</option>
              {eligibleThirds.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
              {/* Keep current if it's no longer in the eligible list */}
              {thirdSlots[match.id] && !eligibleThirds.find((t) => t.id === thirdSlots[match.id]) && (
                <option value={thirdSlots[match.id]!}>
                  {teamById.get(thirdSlots[match.id]!)?.name ?? "?"}
                </option>
              )}
            </select>
          </div>
        )}

        {/* Match buttons */}
        <div className="flex items-center gap-1.5">
          {teamA ? (
            <button
              title={teamA.name}
              disabled={isLocked || !idB}
              onClick={() => pickWinner(match.id, idA!)}
              className={`${btnBase} ${validWinner === idA ? btnActive : btnIdle} flex-1`}
            >
              {teamA.code}
            </button>
          ) : (
            <div className={`${btnBase} ${btnEmpty} flex-1 text-center`}>
              {slotLabel(match.slotA)}
            </div>
          )}

          <span className="text-gray-300 shrink-0 text-[10px]">×</span>

          {teamB ? (
            <button
              title={teamB.name}
              disabled={isLocked || !idA}
              onClick={() => pickWinner(match.id, idB!)}
              className={`${btnBase} ${validWinner === idB ? btnActive : btnIdle} flex-1`}
            >
              {teamB.code}
            </button>
          ) : (
            <div className={`${btnBase} ${btnEmpty} flex-1 text-center`}>
              {slotLabel(match.slotB)}
            </div>
          )}
        </div>

        {validWinner && (
          <div className="text-[10px] text-[#009C3B]">
            ✓ {teamById.get(validWinner)?.name}
          </div>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Deadline banner */}
      {deadlineStr && !isLocked && (
        <div className="border border-green-200 rounded-lg px-4 py-3 bg-green-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#009C3B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            <span className="text-gray-500">Data limite:</span>{" "}
            <span className="font-medium">{deadlineStr}</span>
          </p>
        </div>
      )}

      {isLocked && (
        <div className="border border-red-200 rounded-lg px-4 py-3 bg-red-50 text-sm text-red-600 font-medium">
          🔒 Prazo encerrado — previsões bloqueadas
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["groups", "bracket"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-[#009C3B] text-[#009C3B]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "groups" ? (
              <>Fase de Grupos <span className="ml-1.5 text-xs text-gray-400">({groupsDone}/12 grupos · {thirdsDone}/8 3ºs)</span></>
            ) : (
              <>Chaveamento <span className="ml-1.5 text-xs text-gray-400">({r32Done}/16 jogos)</span></>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Fase de Grupos ── */}
      {tab === "groups" && (
        <div className="space-y-6">
          {/* Instruction */}
          <p className="text-xs text-gray-500">
            Clique nos times para classificar: <span className="font-medium text-yellow-600">1º</span>{" "}
            → <span className="font-medium text-gray-500">2º</span>{" "}
            → <span className="font-medium text-orange-500">3º</span> lugar em cada grupo.
            Clique novamente para desmarcar.
          </p>

          {/* Group cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {GROUPS.map((g) => {
              const gp = groupPicks[g] ?? { first: null, second: null, third: null };
              const grpTeams = teamsByGroup[g] ?? [];
              return (
                <div key={g} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#006B2B]">Grupo {g}</span>
                    {gp.first && gp.second && (
                      <span className="text-[10px] text-green-600">✓</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {grpTeams.map((t) => {
                      const pos = gp.first === t.id ? 1 : gp.second === t.id ? 2 : gp.third === t.id ? 3 : null;
                      const posColors: Record<number | string, string> = {
                        1: "bg-yellow-400 text-yellow-900 border-yellow-400",
                        2: "bg-gray-300 text-gray-700 border-gray-300",
                        3: "bg-orange-200 text-orange-800 border-orange-200",
                      };
                      return (
                        <button
                          key={t.id}
                          title={t.name}
                          disabled={isLocked}
                          onClick={() => clickTeamInGroup(g, t.id)}
                          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-colors text-left ${
                            pos
                              ? posColors[pos]
                              : "border-gray-200 bg-gray-50 hover:border-gray-400 text-gray-700"
                          } disabled:opacity-60`}
                        >
                          {pos && (
                            <span className="w-4 h-4 rounded-full bg-white/70 text-[9px] font-bold flex items-center justify-center shrink-0 text-gray-700">
                              {pos}
                            </span>
                          )}
                          <span className="font-medium">{t.code}</span>
                          <span className="text-[10px] truncate opacity-70">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best thirds */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-sm">Melhores 3ºs Classificados</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Selecione os 8 terceiros colocados que você acredita que avançarão.
                </p>
              </div>
              <span className={`text-sm font-medium ${qualifiedThirds.size === 8 ? "text-[#009C3B]" : "text-gray-400"}`}>
                {qualifiedThirds.size}/8
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {GROUPS.map((g) => {
                const t = thirdsByGroup[g];
                if (!t) {
                  return (
                    <div key={g} className="border border-dashed border-gray-200 rounded px-2 py-1.5 text-xs text-gray-300">
                      Grupo {g} — ?
                    </div>
                  );
                }
                const isSelected = qualifiedThirds.has(t.id);
                const isFull = qualifiedThirds.size >= 8 && !isSelected;
                return (
                  <button
                    key={g}
                    title={t.name}
                    disabled={isLocked || isFull}
                    onClick={() => toggleQualifiedThird(t.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-[#009C3B] text-white border-[#009C3B]"
                        : "border-gray-200 hover:border-gray-400 text-gray-700"
                    } disabled:opacity-40`}
                  >
                    <span className="text-[10px] text-gray-400 shrink-0">Gr.{g}</span>
                    <span className="font-medium">{t.code}</span>
                    <span className="truncate text-[10px] opacity-70">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setTab("bracket")}
              className="px-4 py-2 text-sm bg-[#009C3B] text-white rounded-md hover:bg-[#006B2B] transition-colors"
            >
              Ir para o Chaveamento →
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: Chaveamento ── */}
      {tab === "bracket" && (
        <div className="space-y-6">
          <p className="text-xs text-gray-500">
            Escolha o vencedor de cada confronto. Os times são determinados automaticamente pelas suas previsões da fase de grupos.
            Nos jogos com slot de <strong>3º lugar</strong>, selecione qual classificado ocupa aquela vaga.
          </p>

          {/* 16avos de Final */}
          <section>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFDF00] text-[#004D20] text-[10px] flex items-center justify-center font-bold">16</span>
              16avos de Final (Segunda Fase)
            </h2>
            {/* Show in pairs that feed into the same R16 match */}
            {[
              [R32[1], R32[4]],  // M74 + M77 → M89
              [R32[0], R32[2]],  // M73 + M75 → M90
              [R32[3], R32[5]],  // M76 + M78 → M91
              [R32[6], R32[7]],  // M79 + M80 → M92
              [R32[10], R32[11]], // M83 + M84 → M93
              [R32[8], R32[9]],   // M81 + M82 → M94
              [R32[13], R32[15]], // M86 + M88 → M95
              [R32[12], R32[14]], // M85 + M87 → M96
            ].map(([mA, mB], i) => (
              <div key={i} className="mb-3">
                <div className="text-[10px] text-gray-400 mb-1.5 pl-1">
                  Vencedores disputam: {R16[i].label}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MatchCard match={mA} />
                  <MatchCard match={mB} />
                </div>
              </div>
            ))}
          </section>

          {/* Oitavas de Final */}
          <section>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFDF00] text-[#004D20] text-[10px] flex items-center justify-center font-bold">8</span>
              Oitavas de Final
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {R16.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>

          {/* Quartas de Final */}
          <section>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFDF00] text-[#004D20] text-[10px] flex items-center justify-center font-bold">4</span>
              Quartas de Final
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {QF.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>

          {/* Semifinais */}
          <section>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFDF00] text-[#004D20] text-[10px] flex items-center justify-center font-bold">2</span>
              Semifinais
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {SF.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>

          {/* Final e 3º lugar */}
          <section>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="text-base">🏆</span> Final e 3º Lugar
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <MatchCard match={FIN} />
              <MatchCard match={THIRD_PLACE} />
            </div>
            {bracketPicks["FIN"] && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-center">
                🏆 Campeão: <strong>{teamById.get(bracketPicks["FIN"]!)?.name}</strong>
                {bracketPicks["3P"] && (
                  <> · 🥉 3º: <strong>{teamById.get(bracketPicks["3P"]!)?.name}</strong></>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Save button */}
      {!isLocked && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2.5 rounded-md font-medium transition-colors ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-[#009C3B] text-white hover:bg-[#006B2B]"
            } disabled:opacity-50`}
          >
            {saving ? "Salvando…" : saved ? "✓ Salvo!" : "Salvar Previsões"}
          </button>
        </div>
      )}
    </div>
  );
}
