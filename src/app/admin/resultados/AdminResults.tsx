"use client";

import { useMemo, useState } from "react";
import { PHASE_LABELS } from "@/lib/scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  homePenalties: number | null;
  awayPenalties: number | null;
  matchDate: string;
  status: string;
}

interface Props {
  matches: Match[];
}

interface Standing {
  teamId: string;
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

// ─── Bracket structure ────────────────────────────────────────────────────────

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];
const PHASE_ORDER = ["GROUP", "ROUND_32", "ROUND_16", "QUARTERS", "SEMIS", "THIRD_PLACE", "FINAL"];

// R32 visual order for bracket alignment
const R32_VISUAL_ORDER = [1, 4, 0, 2, 3, 5, 6, 7, 10, 11, 8, 9, 13, 15, 12, 14];

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ScoreState {
  home: string;
  away: string;
  status: string;
  homePen: string;
  awayPen: string;
}

function computeStandings(
  groupMatches: Match[],
  scores: Record<string, ScoreState>,
): Standing[] {
  const stats = new Map<string, Standing>();

  for (const m of groupMatches) {
    if (m.homeTeam && !stats.has(m.homeTeam.id)) {
      stats.set(m.homeTeam.id, {
        teamId: m.homeTeam.id, team: m.homeTeam,
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
      });
    }
    if (m.awayTeam && !stats.has(m.awayTeam.id)) {
      stats.set(m.awayTeam.id, {
        teamId: m.awayTeam.id, team: m.awayTeam,
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
      });
    }
  }

  for (const m of groupMatches) {
    const s = scores[m.id];
    if (!s) continue;
    if (s.status !== "FINISHED") continue;
    const h = parseInt(s.home, 10);
    const a = parseInt(s.away, 10);
    if (isNaN(h) || isNaN(a)) continue;
    if (!m.homeTeam || !m.awayTeam) continue;
    const home = stats.get(m.homeTeam.id);
    const away = stats.get(m.awayTeam.id);
    if (!home || !away) continue;
    home.played++; away.played++;
    home.goalsFor += h; home.goalsAgainst += a;
    away.goalsFor += a; away.goalsAgainst += h;
    if (h > a) { home.wins++; home.points += 3; away.losses++; }
    else if (h < a) { away.wins++; away.points += 3; home.losses++; }
    else { home.draws++; home.points++; away.draws++; away.points++; }
  }
  for (const s of stats.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;

  return Array.from(stats.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.name.localeCompare(b.team.name);
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminResults({ matches }: Props) {
  const [filter, setFilter] = useState<string>("GROUP");
  const [scores, setScores] = useState<Record<string, ScoreState>>(() => {
    const init: Record<string, ScoreState> = {};
    for (const m of matches) {
      init[m.id] = {
        home: m.homeScore !== null ? String(m.homeScore) : "",
        away: m.awayScore !== null ? String(m.awayScore) : "",
        status: m.status,
        homePen: m.homePenalties !== null ? String(m.homePenalties) : "",
        awayPen: m.awayPenalties !== null ? String(m.awayPenalties) : "",
      };
    }
    return init;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoForming, setAutoForming] = useState(false);

  function update(matchId: string, field: keyof ScoreState, value: string) {
    setScores((prev) => {
      const cur = prev[matchId] ?? { home: "", away: "", status: "SCHEDULED", homePen: "", awayPen: "" };
      if (cur[field] === value) return prev;
      return { ...prev, [matchId]: { ...cur, [field]: value } };
    });
    setDirty((prev) => {
      if (prev.has(matchId)) return prev;
      const next = new Set(prev);
      next.add(matchId);
      return next;
    });
  }

  async function saveAll() {
    if (dirty.size === 0) return;
    setSaving(true);
    setError(null);

    const updates = Array.from(dirty)
      .map((id) => {
        const s = scores[id];
        const h = parseInt(s.home, 10);
        const a = parseInt(s.away, 10);
        const hp = s.homePen !== "" ? parseInt(s.homePen, 10) : null;
        const ap = s.awayPen !== "" ? parseInt(s.awayPen, 10) : null;
        return {
          matchId: id,
          homeScore: h,
          awayScore: a,
          status: s.status,
          homePenalties: hp !== null && !isNaN(hp) ? hp : null,
          awayPenalties: ap !== null && !isNaN(ap) ? ap : null,
        };
      })
      .filter((u) => !isNaN(u.homeScore) && !isNaN(u.awayScore));

    if (updates.length === 0) {
      setError("Nenhum placar válido para salvar.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok) {
        setDirty(new Set());
        setSavedAt(new Date());
        setTimeout(() => setSavedAt(null), 3500);
      } else {
        setError(data.error ?? "Erro ao salvar");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function autoFormBracket() {
    if (!confirm("Formar automaticamente os 16 confrontos da Segunda Fase com base nos resultados da Fase de Grupos?")) return;
    setAutoForming(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auto-bracket", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        // Reload page to fetch new team assignments
        window.location.reload();
      } else {
        setError(data.error ?? "Erro ao formar bracket");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setAutoForming(false);
    }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const matchesByPhase = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!map[m.phase]) map[m.phase] = [];
      map[m.phase].push(m);
    }
    return map;
  }, [matches]);

  const phasesPresent = PHASE_ORDER.filter((p) => matchesByPhase[p]?.length);

  // Group phase organization
  const groupMatchesByGroup = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) {
      if (m.phase !== "GROUP") continue;
      const g = m.groupLabel ?? "?";
      if (!map[g]) map[g] = [];
      map[g].push(m);
    }
    for (const g of Object.keys(map)) {
      map[g].sort((a, b) => a.matchOrder - b.matchOrder);
    }
    return map;
  }, [matches]);

  // Group complete check (all 6 matches finished with valid scores)
  const allGroupsComplete = useMemo(() => {
    const groupMatches = matches.filter((m) => m.phase === "GROUP");
    if (groupMatches.length === 0) return false;
    return groupMatches.every((m) => {
      const s = scores[m.id];
      if (!s || s.status !== "FINISHED") return false;
      const h = parseInt(s.home, 10);
      const a = parseInt(s.away, 10);
      return !isNaN(h) && !isNaN(a);
    });
  }, [matches, scores]);

  // ─── Match card (compact, shared) ─────────────────────────────────────────

  function MatchCard({ match }: { match: Match }) {
    const s = scores[match.id] ?? { home: "", away: "", status: "SCHEDULED", homePen: "", awayPen: "" };
    const isDirty = dirty.has(match.id);
    const isFinished = s.status === "FINISHED";
    const dateStr = new Date(match.matchDate).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit",
    });

    // Penalty inputs are only relevant for knockout matches that ended tied
    const isKnockout = match.phase !== "GROUP";
    const hScore = parseInt(s.home, 10);
    const aScore = parseInt(s.away, 10);
    const isTied = !isNaN(hScore) && !isNaN(aScore) && hScore === aScore;
    const showPenalties = isKnockout && isTied;
    const hPen = parseInt(s.homePen, 10);
    const aPen = parseInt(s.awayPen, 10);
    const penaltyWinner =
      !isNaN(hPen) && !isNaN(aPen)
        ? hPen > aPen ? "home" : aPen > hPen ? "away" : null
        : null;

    return (
      <div
        className={`border rounded-lg p-2 bg-white text-xs space-y-1.5 ${
          isFinished
            ? "border-green-200 bg-green-50"
            : s.status === "LIVE"
              ? "border-yellow-200 bg-yellow-50"
              : isDirty
                ? "border-blue-300"
                : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] text-gray-400 uppercase tracking-wide">
            #{match.matchOrder} · {dateStr}
          </span>
          {isDirty && <span className="text-[9px] text-blue-500 font-bold">●</span>}
        </div>

        {/* Team A row */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1 truncate text-[11px] font-medium" title={match.homeTeam?.name}>
            {match.homeTeam?.code ?? "TBD"}
          </span>
          <input
            type="number"
            min={0}
            max={99}
            value={s.home}
            onChange={(e) => update(match.id, "home", e.target.value)}
            className="w-9 h-7 text-center border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
        {/* Team B row */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1 truncate text-[11px] font-medium" title={match.awayTeam?.name}>
            {match.awayTeam?.code ?? "TBD"}
          </span>
          <input
            type="number"
            min={0}
            max={99}
            value={s.away}
            onChange={(e) => update(match.id, "away", e.target.value)}
            className="w-9 h-7 text-center border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        {/* Penalty inputs (knockout phase + tied score) */}
        {showPenalties && (
          <div className="border-t border-yellow-200 pt-1.5 mt-1 bg-yellow-50/50 -mx-2 px-2 pb-1.5 -mb-1.5">
            <div className="text-[9px] text-amber-700 font-semibold uppercase tracking-wide mb-1">
              Pênaltis (não conta na pontuação)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex-1 truncate text-[10px] text-gray-600" title={match.homeTeam?.name}>
                {match.homeTeam?.code ?? "?"}
              </span>
              <input
                type="number"
                min={0}
                max={20}
                value={s.homePen}
                onChange={(e) => update(match.id, "homePen", e.target.value)}
                className="w-9 h-6 text-center border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="flex-1 truncate text-[10px] text-gray-600" title={match.awayTeam?.name}>
                {match.awayTeam?.code ?? "?"}
              </span>
              <input
                type="number"
                min={0}
                max={20}
                value={s.awayPen}
                onChange={(e) => update(match.id, "awayPen", e.target.value)}
                className="w-9 h-6 text-center border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {penaltyWinner && (
              <div className="text-[9px] text-amber-700 mt-1">
                ✓ {penaltyWinner === "home" ? match.homeTeam?.name : match.awayTeam?.name} avança
              </div>
            )}
          </div>
        )}

        <select
          value={s.status}
          onChange={(e) => update(match.id, "status", e.target.value)}
          className="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="SCHEDULED">Agendado</option>
          <option value="LIVE">Ao Vivo</option>
          <option value="FINISHED">Finalizado</option>
        </select>
      </div>
    );
  }

  // ─── Standings table ────────────────────────────────────────────────────────

  function StandingsTable({ standings, group }: { standings: Standing[]; group: string }) {
    return (
      <div className="border-t border-gray-200 mt-3 pt-2">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
          Classificação Grupo {group}
        </p>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-400 text-[9px]">
              <th className="text-left py-0.5 px-1">#</th>
              <th className="text-left py-0.5 px-1">Time</th>
              <th className="text-center py-0.5 px-1">P</th>
              <th className="text-center py-0.5 px-1">J</th>
              <th className="text-center py-0.5 px-1">SG</th>
              <th className="text-center py-0.5 px-1">GP</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const rowBg = i < 2 ? "bg-green-50" : i === 2 ? "bg-yellow-50" : "";
              const posBadge = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
              return (
                <tr key={s.teamId} className={`border-t border-gray-100 ${rowBg}`}>
                  <td className="py-0.5 px-1 text-gray-500">{i + 1}</td>
                  <td className="py-0.5 px-1" title={s.team.name}>
                    <span className="font-medium">{s.team.code}</span>
                    {posBadge && <span className="ml-1">{posBadge}</span>}
                  </td>
                  <td className="text-center py-0.5 px-1 font-bold">{s.points}</td>
                  <td className="text-center py-0.5 px-1 text-gray-500">{s.played}</td>
                  <td className="text-center py-0.5 px-1 text-gray-500">
                    {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
                  </td>
                  <td className="text-center py-0.5 px-1 text-gray-500">{s.goalsFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const phaseMatches = matchesByPhase[filter] ?? [];
  const phaseMatchesByMatchOrder = useMemo(
    () => [...phaseMatches].sort((a, b) => a.matchOrder - b.matchOrder),
    [phaseMatches],
  );

  return (
    <div className="space-y-4 pb-32">
      {/* Phase filter */}
      <div className="flex flex-wrap gap-2">
        {phasesPresent.map((phase) => {
          const count = matchesByPhase[phase]?.length ?? 0;
          const finished = matchesByPhase[phase]?.filter((m) => scores[m.id]?.status === "FINISHED").length ?? 0;
          return (
            <button
              key={phase}
              onClick={() => setFilter(phase)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5 ${
                filter === phase
                  ? "bg-black text-white border-black"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              {PHASE_LABELS[phase] ?? phase}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === phase ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {finished}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Auto-form Segunda Fase button (visible on GROUP filter) */}
      {filter === "GROUP" && (
        <div className="flex items-center gap-2 flex-wrap p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
          <span className="text-xs text-gray-700 flex-1">
            {allGroupsComplete
              ? "Todos os jogos da fase de grupos estão finalizados."
              : "Finalize todos os 48 jogos da fase de grupos para liberar a formação automática."}
          </span>
          <button
            onClick={autoFormBracket}
            disabled={!allGroupsComplete || autoForming || dirty.size > 0}
            className="text-xs bg-[#006B2B] text-white px-3 py-1.5 rounded hover:bg-[#005020] disabled:opacity-50"
            title={dirty.size > 0 ? "Salve as alterações pendentes antes" : ""}
          >
            {autoForming ? "Formando..." : "🏆 Formar Segunda Fase automaticamente"}
          </button>
        </div>
      )}

      {/* GROUP phase: 12 group cards with standings */}
      {filter === "GROUP" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {GROUPS.map((g) => {
            const grpMatches = groupMatchesByGroup[g] ?? [];
            const standings = computeStandings(grpMatches, scores);
            return (
              <div key={g} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-[#006B2B] text-white px-3 py-1.5 text-sm font-bold">
                  Grupo {g}
                </div>
                <div className="p-3 space-y-2">
                  {grpMatches.map((m) => <MatchCard key={m.id} match={m} />)}
                  {standings.length > 0 && <StandingsTable standings={standings} group={g} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ROUND_32: visual bracket grid (desktop) + sectioned (mobile) */}
      {filter === "ROUND_32" && (
        <>
          {/* Desktop: 4-col bracket */}
          <div className="hidden lg:block overflow-x-auto pb-4">
            <div
              className="grid gap-x-6 min-w-[800px]"
              style={{
                gridTemplateColumns: "200px 200px",
                gridTemplateRows: "repeat(16, minmax(95px, auto))",
              }}
            >
              <div
                style={{ gridColumn: 1, gridRow: "1 / span 1" }}
                className="text-[11px] font-bold text-[#006B2B] border-b-2 border-[#FFDF00] pb-1.5 mb-1"
              >
                16avos (esquerda)
              </div>
              <div
                style={{ gridColumn: 2, gridRow: "1 / span 1" }}
                className="text-[11px] font-bold text-[#006B2B] border-b-2 border-[#FFDF00] pb-1.5 mb-1"
              >
                16avos (direita)
              </div>
              {R32_VISUAL_ORDER.map((idx, i) => {
                const m = phaseMatchesByMatchOrder[idx];
                if (!m) return null;
                const col = i < 8 ? 1 : 2;
                const row = (i % 8) * 2 + 2;
                return (
                  <div
                    key={m.id}
                    style={{ gridColumn: col, gridRow: `${row} / span 2`, alignSelf: "center" }}
                  >
                    <MatchCard match={m} />
                  </div>
                );
              })}
            </div>
          </div>
          {/* Mobile: simple grid */}
          <div className="lg:hidden grid grid-cols-2 gap-2">
            {phaseMatchesByMatchOrder.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </>
      )}

      {/* Knockout phases ROUND_16 onwards: bracket-style grid */}
      {filter !== "GROUP" && filter !== "ROUND_32" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {phaseMatchesByMatchOrder.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}

      {/* Sticky bottom save bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            {dirty.size > 0 ? (
              <span className="text-blue-600 font-medium">
                {dirty.size} alteraç{dirty.size === 1 ? "ão" : "ões"} não salva{dirty.size === 1 ? "" : "s"}
              </span>
            ) : savedAt ? (
              <span className="text-green-600">✓ Salvo às {savedAt.toLocaleTimeString("pt-BR")}</span>
            ) : (
              <span className="text-gray-400">Nenhuma alteração pendente</span>
            )}
            {error && <span className="ml-3 text-red-600">{error}</span>}
          </div>
          <button
            onClick={saveAll}
            disabled={saving || dirty.size === 0}
            className="bg-black text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Salvando..." : `Salvar ${dirty.size > 0 ? `(${dirty.size})` : "tudo"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
