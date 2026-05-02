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
  thirdSlots: ThirdSlots;
  bracketPicks: BracketPicks;
}

interface GroupMatch {
  id: string;
  groupLabel: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

interface ScorePred {
  homeScore: number;
  awayScore: number;
}

interface Standing {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface PhasePointsInfo {
  earned: number;
  correct: number;
  resolved: number;
}

interface TeamPhaseResult {
  correct: boolean | null;
  points: number | null;
}

interface ChampionPoints {
  championPoints: number | null;
  runnerUpPoints: number | null;
  thirdPlacePoints: number | null;
}

interface Props {
  teams: Team[];
  groupMatches: GroupMatch[];
  predictionsMap: Record<string, ScorePred>;
  phasePoints: Record<string, PhasePointsInfo>;
  teamPhaseResults: Record<string, Record<string, TeamPhaseResult>>;
  initialBracketState: Partial<BracketState> & {
    // tolerate legacy fields from previous saves; we ignore them
    groupPicks?: unknown;
    qualifiedThirds?: unknown;
  };
  isLocked: boolean;
  deadline: string | null;
  championPoints?: ChampionPoints | null;
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
  groupMatches,
  predictionsMap,
  phasePoints,
  teamPhaseResults,
  initialBracketState,
  isLocked,
  deadline,
  championPoints,
}: Props) {
  const [tab, setTab] = useState<"groups" | "bracket">("groups");

  // Bracket state (only what's editable now)
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

  // ─── Derived: standings from user's group score predictions ──────────────
  const standingsByGroup = useMemo(() => {
    const result: Record<string, Standing[]> = {};

    function compareStanding(a: Standing, b: Standing) {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      // Final tiebreaker: alphabetical by team name (deterministic)
      const ta = teamById.get(a.teamId);
      const tb = teamById.get(b.teamId);
      return (ta?.name ?? "").localeCompare(tb?.name ?? "");
    }

    for (const g of GROUPS) {
      const grpTeams = teamsByGroup[g] ?? [];
      const standings = new Map<string, Standing>();
      for (const t of grpTeams) {
        standings.set(t.id, {
          teamId: t.id, played: 0, wins: 0, draws: 0, losses: 0,
          goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
        });
      }

      const grpMatches = groupMatches.filter((m) => m.groupLabel === g);
      for (const m of grpMatches) {
        if (!m.homeTeamId || !m.awayTeamId) continue;
        const pred = predictionsMap[m.id];
        if (!pred) continue;
        const h = standings.get(m.homeTeamId);
        const a = standings.get(m.awayTeamId);
        if (!h || !a) continue;
        h.played++; a.played++;
        h.goalsFor += pred.homeScore;
        h.goalsAgainst += pred.awayScore;
        a.goalsFor += pred.awayScore;
        a.goalsAgainst += pred.homeScore;
        if (pred.homeScore > pred.awayScore) {
          h.wins++; h.points += 3; a.losses++;
        } else if (pred.homeScore < pred.awayScore) {
          a.wins++; a.points += 3; h.losses++;
        } else {
          h.draws++; h.points++; a.draws++; a.points++;
        }
      }
      for (const s of standings.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;

      result[g] = Array.from(standings.values()).sort(compareStanding);
    }
    return result;
  }, [teamsByGroup, groupMatches, predictionsMap, teamById]);

  // groupPicks (1st/2nd/3rd) derived from standings
  const groupPicks: GroupPicks = useMemo(() => {
    const result: GroupPicks = {};
    for (const g of GROUPS) {
      const s = standingsByGroup[g] ?? [];
      result[g] = {
        first: s[0]?.teamId ?? null,
        second: s[1]?.teamId ?? null,
        third: s[2]?.teamId ?? null,
      };
    }
    return result;
  }, [standingsByGroup]);

  // 8 best 3rds derived from standings (top 8 by pts → SG → GP → name)
  const qualifiedThirds: Set<string> = useMemo(() => {
    const thirds: Standing[] = [];
    for (const g of GROUPS) {
      const s = standingsByGroup[g];
      if (s && s[2]) thirds.push(s[2]);
    }
    thirds.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      const ta = teamById.get(a.teamId);
      const tb = teamById.get(b.teamId);
      return (ta?.name ?? "").localeCompare(tb?.name ?? "");
    });
    return new Set(thirds.slice(0, 8).map((s) => s.teamId));
  }, [standingsByGroup, teamById]);

  // Track per-group prediction completeness
  const incompleteGroups = useMemo(() => {
    const result: string[] = [];
    for (const g of GROUPS) {
      const grpMatches = groupMatches.filter((m) => m.groupLabel === g);
      if (grpMatches.length === 0) continue;
      const allPredicted = grpMatches.every((m) => predictionsMap[m.id]);
      if (!allPredicted) result.push(g);
    }
    return result;
  }, [groupMatches, predictionsMap]);

  // Resolve slot helper bound to current state
  const resolve = (slot: Slot, matchId: string) =>
    resolveSlot(slot, matchId, groupPicks, thirdSlots, bracketPicks);

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

    const bracketState: BracketState = { thirdSlots, bracketPicks };

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
  const groupsDone = GROUPS.filter((g) => !incompleteGroups.includes(g)).length;
  const r32Done = R32.filter((m) => bracketPicks[m.id]).length;

  // Helper: badge showing the resolution result for a (team, phase) prediction
  function teamPhaseBadge(teamId: string | null | undefined, phase: string, compact = false) {
    if (!teamId) return null;
    const r = teamPhaseResults[teamId]?.[phase];
    if (!r || r.correct === null) return null;
    if (r.correct) {
      return (
        <span
          title={`Acertou! +${r.points ?? 0} pts`}
          className={`shrink-0 inline-flex items-center font-bold rounded ${
            compact
              ? "text-[8px] px-1 py-px bg-yellow-300 text-[#004D20]"
              : "text-[9px] px-1.5 py-0.5 bg-[#FFDF00] text-[#004D20]"
          }`}
        >
          ✓+{r.points ?? 0}
        </span>
      );
    }
    return (
      <span
        title="Errou — 0 pts"
        className={`shrink-0 inline-flex items-center font-bold rounded ${
          compact
            ? "text-[8px] px-1 py-px bg-red-100 text-red-500"
            : "text-[9px] px-1.5 py-0.5 bg-red-50 text-red-500"
        }`}
      >
        ✗0
      </span>
    );
  }

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

    const sizeClasses = small
      ? "text-[11px] px-2 py-1.5"
      : "text-xs px-2.5 py-2";
    const btnActive = "bg-[#009C3B] text-white border-[#009C3B] shadow-sm";
    const btnIdle = "border-gray-300 bg-white hover:border-[#009C3B] hover:bg-green-50 text-gray-800";
    const btnEmpty = "border-dashed border-gray-200 bg-gray-50 text-gray-300 cursor-default";
    const btnLoser = "border-gray-200 bg-gray-50 text-gray-400 line-through";

    function teamButton(
      team: Team | null | undefined,
      teamId: string | null,
      slot: Slot,
      otherId: string | null,
    ) {
      const isWinner = validWinner && validWinner === teamId;
      const isLoser = validWinner && teamId && validWinner !== teamId;
      if (!team) {
        return (
          <div className={`w-full rounded border ${sizeClasses} ${btnEmpty} text-center truncate`}>
            {slotLabel(slot)}
          </div>
        );
      }
      return (
        <button
          title={team.name}
          disabled={isLocked || !otherId}
          onClick={() => pickWinner(match.id, teamId!)}
          className={`w-full rounded border font-medium transition-colors truncate text-left flex items-center gap-1.5 ${sizeClasses} ${
            isWinner ? btnActive : isLoser ? btnLoser : btnIdle
          } disabled:opacity-50`}
        >
          <span className={`shrink-0 ${isWinner ? "text-white/70" : "text-gray-400"} text-[9px] font-bold`}>
            {team.code}
          </span>
          <span className="truncate flex-1 text-[10px]">{team.name}</span>
          {teamPhaseBadge(teamId, match.phase, true)}
        </button>
      );
    }

    return (
      <div className="border border-gray-200 rounded-lg p-2 bg-white space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">
            {match.label}
          </span>
          {validWinner && (
            <span className="text-[9px] text-[#009C3B]">✓</span>
          )}
        </div>

        {/* 3rd-place slot selector */}
        {thirdSlot && (
          <div>
            <div className="text-[9px] text-gray-400 mb-0.5">
              3º ({thirdSlot.eligible.join("/")})
            </div>
            <select
              value={thirdSlots[match.id] ?? ""}
              onChange={(e) => assignThirdSlot(match.id, e.target.value)}
              disabled={isLocked}
              className="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#009C3B] disabled:opacity-50 disabled:bg-gray-100"
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

        {/* Stacked team buttons (vertical bracket layout) */}
        <div className="space-y-1">
          {teamButton(teamA, idA, match.slotA, idB)}
          {teamButton(teamB, idB, match.slotB, idA)}
        </div>
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
              <>Fase de Grupos <span className="ml-1.5 text-xs text-gray-400">({groupsDone}/12 grupos)</span></>
            ) : (
              <>Chaveamento <span className="ml-1.5 text-xs text-gray-400">({r32Done}/16 jogos)</span></>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Fase de Grupos ── */}
      {tab === "groups" && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="border border-blue-200 bg-blue-50 rounded-lg px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-gray-700 leading-relaxed">
              As classificações abaixo são <strong>derivadas automaticamente</strong> dos seus palpites de placar
              da fase de grupos. Para alterar, edite seus palpites em{" "}
              <a href="/palpites/grupos" className="text-[#009C3B] font-medium underline">Palpites de Grupos</a>.
              <br />
              Critérios de desempate: <span className="font-medium">pontos → saldo de gols → gols pró → ordem alfabética</span>.
            </div>
          </div>

          {incompleteGroups.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-800">
              ⚠ Você ainda não preencheu todos os jogos dos grupos:{" "}
              <strong>{incompleteGroups.join(", ")}</strong>. As classificações desses grupos podem estar incompletas.
            </div>
          )}

          {/* Group standings tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {GROUPS.map((g) => {
              const standings = standingsByGroup[g] ?? [];
              return (
                <div key={g} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-[#006B2B] text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between">
                    <span>Grupo {g}</span>
                    {incompleteGroups.includes(g) && <span className="text-amber-200 text-[10px]">incompleto</span>}
                  </div>
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-50 text-gray-500 text-[10px]">
                      <tr>
                        <th className="px-1.5 py-1 text-left font-medium">#</th>
                        <th className="px-1.5 py-1 text-left font-medium">Time</th>
                        <th className="px-1 py-1 text-center font-medium">P</th>
                        <th className="px-1 py-1 text-center font-medium">J</th>
                        <th className="px-1 py-1 text-center font-medium">SG</th>
                        <th className="px-1 py-1 text-center font-medium">GP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => {
                        const t = teamById.get(s.teamId);
                        const isQualifiedThird = i === 2 && qualifiedThirds.has(s.teamId);
                        const rowBg =
                          i < 2
                            ? "bg-green-50"
                            : isQualifiedThird
                              ? "bg-yellow-50"
                              : "";
                        const posBadge =
                          i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 && isQualifiedThird ? "🥉" : "";
                        return (
                          <tr key={s.teamId} className={`border-t border-gray-100 ${rowBg}`}>
                            <td className="px-1.5 py-1 text-gray-500">{i + 1}</td>
                            <td className="px-1.5 py-1" title={t?.name}>
                              <span className="font-medium">{t?.code}</span>
                              {posBadge && <span className="ml-1">{posBadge}</span>}
                              {(i < 2 || isQualifiedThird) && (
                                <span className="ml-1 inline-block align-middle">
                                  {teamPhaseBadge(s.teamId, "ROUND_32", true)}
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-1 text-center font-bold">{s.points}</td>
                            <td className="px-1 py-1 text-center text-gray-500">{s.played}</td>
                            <td className="px-1 py-1 text-center text-gray-500">
                              {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                            </td>
                            <td className="px-1 py-1 text-center text-gray-500">{s.goalsFor}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Best thirds — read-only ranking */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-sm">Melhores 3ºs Classificados</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Os 8 melhores terceiros colocados (pelos seus palpites) avançam à Segunda Fase.
                </p>
              </div>
              <span className="text-sm font-medium text-[#009C3B]">{qualifiedThirds.size}/8</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {(() => {
                // Show all 12 thirds ranked
                const thirds: { team: Team; standing: Standing; group: string }[] = [];
                for (const g of GROUPS) {
                  const s = standingsByGroup[g];
                  if (s && s[2]) {
                    const t = teamById.get(s[2].teamId);
                    if (t) thirds.push({ team: t, standing: s[2], group: g });
                  }
                }
                thirds.sort((a, b) => {
                  if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
                  if (b.standing.goalDiff !== a.standing.goalDiff) return b.standing.goalDiff - a.standing.goalDiff;
                  if (b.standing.goalsFor !== a.standing.goalsFor) return b.standing.goalsFor - a.standing.goalsFor;
                  return a.team.name.localeCompare(b.team.name);
                });
                return thirds.map((t, i) => {
                  const advances = i < 8;
                  return (
                    <div
                      key={t.team.id}
                      title={t.team.name}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs ${
                        advances
                          ? "bg-[#009C3B] text-white border-[#009C3B]"
                          : "border-gray-200 text-gray-400 bg-gray-50"
                      }`}
                    >
                      <span className={`text-[10px] shrink-0 ${advances ? "text-white/80" : "text-gray-300"}`}>
                        Gr.{t.group}
                      </span>
                      <span className="font-medium">{t.team.code}</span>
                      <span className={`truncate text-[10px] ${advances ? "opacity-90" : "opacity-70"}`}>
                        {t.standing.points}pts
                      </span>
                      {advances && (
                        <span className="ml-auto">
                          {teamPhaseBadge(t.team.id, "ROUND_32", true)}
                        </span>
                      )}
                      {!advances && <span className="text-[9px] ml-auto">×</span>}
                    </div>
                  );
                });
              })()}
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

          {(() => {
            const totalEarned = Object.values(phasePoints).reduce((a, p) => a + p.earned, 0);
            const totalCorrect = Object.values(phasePoints).reduce((a, p) => a + p.correct, 0);
            const totalResolved = Object.values(phasePoints).reduce((a, p) => a + p.resolved, 0);
            if (totalResolved === 0) return null;
            return (
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between">
                <span className="text-gray-700">Pontuação acumulada nos classificados:</span>
                <span className="font-bold text-[#006B2B]">
                  {totalEarned} pts <span className="text-xs text-gray-500 font-normal">({totalCorrect}/{totalResolved} acertos)</span>
                </span>
              </div>
            );
          })()}

          {/* ── DESKTOP: visual bracket grid (md+) ── */}
          <div className="hidden md:block overflow-x-auto pb-4">
            <div
              className="grid gap-x-6 min-w-[1100px]"
              style={{
                gridTemplateColumns: "200px 175px 175px 175px 200px",
                gridTemplateRows: "repeat(16, minmax(95px, auto))",
              }}
            >
              {/* Round headers */}
              {([
                { col: 1, label: "16avos (Segunda Fase)", phase: "ROUND_32" },
                { col: 2, label: "Oitavas", phase: "ROUND_16" },
                { col: 3, label: "Quartas", phase: "QUARTERS" },
                { col: 4, label: "Semis", phase: "SEMIS" },
                { col: 5, label: "Final", phase: "FINAL" },
              ] as const).map((h) => {
                const info = phasePoints[h.phase];
                const showPts = info && info.resolved > 0;
                return (
                  <div
                    key={h.col}
                    style={{ gridColumn: h.col, gridRow: "1 / span 1", alignSelf: "start" }}
                    className="text-[11px] font-bold text-[#006B2B] border-b-2 border-[#FFDF00] pb-1.5 mb-1 flex items-center justify-between"
                  >
                    <span>{h.label}</span>
                    {showPts && (
                      <span className="text-[9px] bg-[#009C3B] text-white px-1.5 py-0.5 rounded-full font-bold">
                        +{info.earned}pts
                      </span>
                    )}
                  </div>
                );
              })}

              {/* R32 — reordered for visual bracket alignment */}
              {[1, 4, 0, 2, 3, 5, 6, 7, 10, 11, 8, 9, 13, 15, 12, 14].map((idx, i) => (
                <div
                  key={R32[idx].id}
                  style={{ gridColumn: 1, gridRow: i + 2, alignSelf: "center" }}
                >
                  <MatchCard match={R32[idx]} />
                </div>
              ))}

              {/* R16 — each spans 2 rows, vertically centered between feeders */}
              {R16.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    gridColumn: 2,
                    gridRow: `${i * 2 + 2} / span 2`,
                    alignSelf: "center",
                  }}
                >
                  <MatchCard match={m} />
                </div>
              ))}

              {/* QF — each spans 4 rows */}
              {QF.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    gridColumn: 3,
                    gridRow: `${i * 4 + 2} / span 4`,
                    alignSelf: "center",
                  }}
                >
                  <MatchCard match={m} />
                </div>
              ))}

              {/* SF — each spans 8 rows */}
              {SF.map((m, i) => (
                <div
                  key={m.id}
                  style={{
                    gridColumn: 4,
                    gridRow: `${i * 8 + 2} / span 8`,
                    alignSelf: "center",
                  }}
                >
                  <MatchCard match={m} />
                </div>
              ))}

              {/* Final — full height of bracket */}
              <div
                style={{ gridColumn: 5, gridRow: "2 / span 16", alignSelf: "center" }}
                className="border-2 border-[#FFDF00] rounded-lg p-1 bg-yellow-50/30"
              >
                <MatchCard match={FIN} />
              </div>
            </div>

            {/* 3rd place match below the main bracket */}
            <div className="mt-6 max-w-[220px] mx-auto">
              <div className="text-[11px] text-center text-gray-500 mb-1.5 font-medium">
                🥉 Disputa de 3º Lugar
              </div>
              <MatchCard match={THIRD_PLACE} />
            </div>
          </div>

          {/* ── MOBILE: vertical sectioned view ── */}
          <div className="md:hidden space-y-5">
            {([
              { phase: "ROUND_32", label: "16avos (Segunda Fase)", count: 16, matches: R32 },
              { phase: "ROUND_16", label: "Oitavas de Final", count: 8, matches: R16 },
              { phase: "QUARTERS", label: "Quartas de Final", count: 4, matches: QF },
              { phase: "SEMIS", label: "Semifinais", count: 2, matches: SF },
              { phase: "FINAL", label: "Final", count: 1, matches: [FIN] },
            ] as const).map((sec) => {
              const info = phasePoints[sec.phase];
              const showPts = info && info.resolved > 0;
              return (
                <section key={sec.phase}>
                  <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFDF00] text-[#004D20] text-[10px] flex items-center justify-center font-bold">
                      {sec.count}
                    </span>
                    {sec.label}
                    {showPts && (
                      <span className="ml-auto text-[10px] bg-[#009C3B] text-white px-2 py-0.5 rounded-full font-bold">
                        +{info.earned} pts ({info.correct}/{info.resolved})
                      </span>
                    )}
                  </h2>
                  <div className={`grid gap-2 ${sec.matches.length >= 8 ? "grid-cols-2" : sec.matches.length >= 4 ? "grid-cols-2" : "grid-cols-2"}`}>
                    {sec.matches.map((m) => <MatchCard key={m.id} match={m} />)}
                  </div>
                </section>
              );
            })}

            <section>
              <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
                <span className="text-base">🥉</span> Disputa de 3º Lugar
              </h2>
              <MatchCard match={THIRD_PLACE} />
            </section>
          </div>

          {/* Champion summary */}
          {bracketPicks["FIN"] && (() => {
            const champ = bracketPicks["FIN"]!;
            const finA = resolve(FIN.slotA, FIN.id);
            const finB = resolve(FIN.slotB, FIN.id);
            const runnerUp = champ === finA ? finB : champ === finB ? finA : null;

            function PtsBadge({ pts }: { pts: number | null | undefined }) {
              if (pts === null || pts === undefined) return null;
              return pts > 0
                ? <span className="inline-block ml-1 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-bold align-middle">+{pts} pts</span>
                : <span className="inline-block ml-1 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-bold align-middle">0 pts</span>;
            }

            return (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-center">
                🏆 Campeão: <strong>{teamById.get(champ)?.name}</strong>
                <PtsBadge pts={championPoints?.championPoints} />
                {runnerUp && (
                  <> · 🥈 Vice: <strong>{teamById.get(runnerUp)?.name}</strong>
                  <PtsBadge pts={championPoints?.runnerUpPoints} /></>
                )}
                {bracketPicks["3P"] && (
                  <> · 🥉 3º: <strong>{teamById.get(bracketPicks["3P"]!)?.name}</strong>
                  <PtsBadge pts={championPoints?.thirdPlacePoints} /></>
                )}
              </div>
            );
          })()}
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
