"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { PHASE_LABELS } from "@/lib/scoring";
import { compareStandings } from "@/lib/standings";

const ESPN_POLL_MS = 45_000;

// Every match is seeded at a placeholder 18:00 UTC, so we can't rely on the
// exact kickoff to know what's live. Instead we treat any non-finished match
// whose stored time is "around now" as a candidate and let ESPN decide if it's
// actually live (it returns "pre"/"in"/"post"; we only write on "in"/"post").
// The window is generous on both sides to absorb the placeholder-time drift:
// real kickoffs range from a few hours before to ~9h after the stored 18:00 UTC.
const AROUND_PAST_MS = 16 * 60 * 60 * 1000; // 16h before
const AROUND_FUTURE_MS = 8 * 60 * 60 * 1000; //  8h after
function isAroundNow(matchDate: string | Date, now: number = Date.now()): boolean {
  const kickoff = new Date(matchDate).getTime();
  return kickoff >= now - AROUND_PAST_MS && kickoff <= now + AROUND_FUTURE_MS;
}

interface SyncInfo {
  at: Date;
  ok: boolean;
  msg: string;
}

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

  return Array.from(stats.values()).sort((a, b) =>
    compareStandings(
      { points: a.points, goalDiff: a.goalDiff, goalsFor: a.goalsFor, code: a.team.code },
      { points: b.points, goalDiff: b.goalDiff, goalsFor: b.goalsFor, code: b.team.code },
    ),
  );
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

  // ─── ESPN auto-sync ──────────────────────────────────────────────────────
  // Opt-in per match. While enabled, polls ESPN and auto-saves the live score.
  // Safety guards live in syncFromEspn(): never SCHEDULED, never decrease a
  // score, never write a blank/invalid score — so the ongoing pool is safe.
  const [autoSyncIds, setAutoSyncIds] = useState<Set<string>>(() => {
    const liveIds = new Set<string>();
    for (const m of matches) {
      if (m.status === "FINISHED") continue;
      if (m.status === "LIVE") { liveIds.add(m.id); continue; }
      if (isAroundNow(m.matchDate)) liveIds.add(m.id);
    }
    return liveIds;
  });
  const [syncInfo, setSyncInfo] = useState<Record<string, SyncInfo>>({});
  // Refs so the polling interval always reads fresh state without re-subscribing.
  const scoresRef = useRef(scores);
  scoresRef.current = scores;
  const autoSyncRef = useRef(autoSyncIds);
  autoSyncRef.current = autoSyncIds;

  function toggleAutoSync(matchId: string) {
    setAutoSyncIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  async function syncFromEspn(matchId: string) {
    try {
      const res = await fetch(`/api/admin/espn-sync?matchId=${matchId}`);
      const data = await res.json();
      if (!res.ok) {
        setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: false, msg: data.error ?? "erro" } }));
        return;
      }
      if (!data.found) {
        setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: false, msg: data.reason ?? "não encontrado" } }));
        return;
      }

      const newHome: number = data.homeScore;
      const newAway: number = data.awayScore;
      const newStatus: string = data.status; // "LIVE" | "FINISHED" — never SCHEDULED
      const cur = scoresRef.current[matchId] ?? { home: "", away: "", status: "SCHEDULED", homePen: "", awayPen: "" };
      const curHome = cur.home === "" ? null : parseInt(cur.home, 10);
      const curAway = cur.away === "" ? null : parseInt(cur.away, 10);

      // Safety: never let ESPN DECREASE an already-saved score (guards against
      // glitches and protects against accidental zeroing).
      if ((curHome !== null && newHome < curHome) || (curAway !== null && newAway < curAway)) {
        setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: false, msg: `ignorado: ESPN ${newHome}x${newAway} < atual` } }));
        return;
      }

      const changed =
        cur.home !== String(newHome) || cur.away !== String(newAway) || cur.status !== newStatus;
      if (!changed) {
        setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: true, msg: `sem mudança (${newHome}x${newAway})` } }));
        return;
      }

      // Reflect in the UI, then persist this single match via the normal flow.
      setScores((prev) => ({
        ...prev,
        [matchId]: { ...cur, home: String(newHome), away: String(newAway), status: newStatus },
      }));

      const saveRes = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{
            matchId,
            homeScore: newHome,
            awayScore: newAway,
            status: newStatus,
            homePenalties: null,
            awayPenalties: null,
          }],
        }),
      });
      if (saveRes.ok) {
        setDirty((prev) => {
          if (!prev.has(matchId)) return prev;
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
        setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: true, msg: `salvo ${newHome}x${newAway}${newStatus === "FINISHED" ? " (FIM)" : ""}` } }));
      } else {
        setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: false, msg: "erro ao salvar" } }));
      }
    } catch {
      setSyncInfo((p) => ({ ...p, [matchId]: { at: new Date(), ok: false, msg: "erro de conexão" } }));
    }
  }

  // Single interval drives all enabled matches; also fires once immediately on enable.
  useEffect(() => {
    if (autoSyncIds.size === 0) return;
    for (const id of autoSyncIds) syncFromEspn(id);
    const timer = setInterval(() => {
      for (const id of autoSyncRef.current) syncFromEspn(id);
    }, ESPN_POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncIds]);

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

  function MatchCard({ match, showAutoSync }: { match: Match; showAutoSync?: boolean }) {
    const s = scores[match.id] ?? { home: "", away: "", status: "SCHEDULED", homePen: "", awayPen: "" };
    const isDirty = dirty.has(match.id);
    const autoOn = autoSyncIds.has(match.id);
    const info = syncInfo[match.id];
    const isFinished = s.status === "FINISHED";
    const dateStr = new Date(match.matchDate)
      .toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
      .replace(", ", " ");

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
    // Finished knockout tie with no shootout winner → bracket is blocked.
    const needsPenalties = showPenalties && isFinished && !penaltyWinner;

    return (
      <div
        data-match-card=""
        className={`border rounded-lg p-2 bg-white text-xs space-y-1.5 ${
          needsPenalties
            ? "border-2 border-red-400 bg-red-50"
            : isFinished
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={s.home}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
              update(match.id, "home", val);
              if (/^\d$/.test(val)) {
                const card = (e.target as HTMLElement).closest("[data-match-card]");
                (card?.querySelector("[data-away-input]") as HTMLInputElement)?.focus();
              }
            }}
            className="w-9 h-7 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
            style={{ fontSize: "16px" }}
          />
        </div>
        {/* Team B row */}
        <div className="flex items-center gap-1.5">
          <span className="flex-1 truncate text-[11px] font-medium" title={match.awayTeam?.name}>
            {match.awayTeam?.code ?? "TBD"}
          </span>
          <input
            data-away-input=""
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={s.away}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
              update(match.id, "away", val);
            }}
            className="w-9 h-7 text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
            style={{ fontSize: "16px" }}
          />
        </div>

        {/* Penalty inputs (knockout phase + tied score) */}
        {showPenalties && (
          <div className="border-t border-yellow-200 pt-1.5 mt-1 bg-yellow-50/50 -mx-2 px-2 pb-1.5 -mb-1.5">
            <div className="text-[9px] text-amber-700 font-semibold uppercase tracking-wide mb-1">
              Pênaltis (não conta na pontuação)
            </div>
            {needsPenalties && (
              <div className="text-[10px] text-red-700 font-medium mb-1.5 leading-snug">
                ⚠️ Empate no mata-mata — informe os pênaltis para definir quem avança.
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="flex-1 truncate text-[10px] text-gray-600" title={match.homeTeam?.name}>
                {match.homeTeam?.code ?? "?"}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={s.homePen}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                  update(match.id, "homePen", val);
                  if (/^\d$/.test(val)) {
                    const card = (e.target as HTMLElement).closest("[data-match-card]");
                    (card?.querySelector("[data-away-pen-input]") as HTMLInputElement)?.focus();
                  }
                }}
                className="w-9 h-6 text-center border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                style={{ fontSize: "16px" }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="flex-1 truncate text-[10px] text-gray-600" title={match.awayTeam?.name}>
                {match.awayTeam?.code ?? "?"}
              </span>
              <input
                data-away-pen-input=""
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={s.awayPen}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                  update(match.id, "awayPen", val);
                }}
                className="w-9 h-6 text-center border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                style={{ fontSize: "16px" }}
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

        {showAutoSync && (
          <div className="border-t border-gray-100 pt-1.5 -mb-0.5">
            <button
              onClick={() => toggleAutoSync(match.id)}
              className={`w-full text-[10px] font-semibold rounded px-1.5 py-1 flex items-center justify-center gap-1 transition-colors ${
                autoOn
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {autoOn ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Auto ESPN ligado
                </>
              ) : (
                "🔄 Auto ESPN"
              )}
            </button>
            {autoOn && info && (
              <p className={`text-[9px] mt-0.5 text-center ${info.ok ? "text-green-600" : "text-amber-600"}`}>
                {info.at.toLocaleTimeString("pt-BR")} · {info.msg}
              </p>
            )}
          </div>
        )}
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

  // Matches happening right now — surfaced at the top for quick goal entry.
  // Counts anything marked LIVE, plus non-finished games whose stored time is
  // "around now" (see isAroundNow) so the admin finds them even before the
  // status flips to LIVE — the placeholder 18:00 UTC time can't be trusted.
  const liveNowMatches = useMemo(() => {
    return matches
      .filter((m) => {
        const st = scores[m.id]?.status ?? m.status;
        if (st === "FINISHED") return false;
        if (st === "LIVE") return true;
        return isAroundNow(m.matchDate);
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }, [matches, scores]);

  // Knockout matches finished in a tie with no penalty winner entered — the
  // bracket can't advance until the admin fills the shootout. Surfaced at the
  // very top because it silently blocks the cascade otherwise.
  const stuckOnPenalties = useMemo(() => {
    return matches
      .filter((m) => {
        if (m.phase === "GROUP") return false;
        const s = scores[m.id];
        if (!s || s.status !== "FINISHED") return false;
        const h = parseInt(s.home, 10);
        const a = parseInt(s.away, 10);
        if (isNaN(h) || isNaN(a) || h !== a) return false; // only tied games
        const hp = parseInt(s.homePen, 10);
        const ap = parseInt(s.awayPen, 10);
        const hasWinner = !isNaN(hp) && !isNaN(ap) && hp !== ap;
        return !hasWinner;
      })
      .sort((a, b) => a.matchOrder - b.matchOrder);
  }, [matches, scores]);

  // Current phase of the tournament: the first phase (in canonical order) that
  // still has at least one match not yet FINISHED. Advances on its own as games
  // finish. null = everything finished (tournament over).
  const currentPhase = useMemo(() => {
    for (const phase of PHASE_ORDER) {
      const pm = matches.filter((m) => m.phase === phase);
      if (pm.length === 0) continue;
      const finished = pm.filter(
        (m) => (scores[m.id]?.status ?? m.status) === "FINISHED",
      ).length;
      if (finished < pm.length) return { phase, finished, total: pm.length };
    }
    return null;
  }, [matches, scores]);

  return (
    <div className="space-y-4 pb-32">
      {/* Current phase indicator */}
      <div className="border-2 border-[#009C3B]/30 bg-green-50 rounded-lg p-3 flex items-center justify-between gap-3">
        {currentPhase ? (
          <>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">
                Fase atual
              </p>
              <p className="text-lg font-bold text-[#006B2B] leading-tight truncate">
                {PHASE_LABELS[currentPhase.phase] ?? currentPhase.phase}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-700">
                {currentPhase.finished}/{currentPhase.total}
              </p>
              <p className="text-[10px] text-gray-400">jogos finalizados</p>
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">
              Fase atual
            </p>
            <p className="text-lg font-bold text-[#006B2B] leading-tight">
              🏆 Torneio encerrado
            </p>
          </div>
        )}
      </div>

      {/* Bracket blocked — knockout tie without a shootout result */}
      {stuckOnPenalties.length > 0 && (
        <div className="border-2 border-red-300 bg-red-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span>⚠️</span>
            <h2 className="text-sm font-bold text-red-800">
              Mata-mata empatado sem pênaltis
            </h2>
            <span className="text-xs text-red-600">
              {stuckOnPenalties.length} {stuckOnPenalties.length === 1 ? "jogo" : "jogos"}
            </span>
          </div>
          <p className="text-[11px] text-red-700/90 mb-2">
            Estes jogos terminaram empatados e ainda não têm o placar dos pênaltis.
            A chave <strong>não avança</strong> até você definir quem passou. Os pontos
            já estão corretos (contam o empate); os pênaltis só decidem o avanço.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {stuckOnPenalties.map((m) => (
              <span
                key={`stuck-${m.id}`}
                className="text-[11px] font-medium bg-white border border-red-200 text-red-700 rounded px-2 py-0.5"
              >
                #{m.matchOrder} {m.homeTeam?.code ?? "?"} {scores[m.id]?.home}×{scores[m.id]?.away} {m.awayTeam?.code ?? "?"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Happening now — quick access */}
      {liveNowMatches.length > 0 && (
        <div className="border-2 border-yellow-300 bg-yellow-50/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-bold text-amber-800">Acontecendo agora</h2>
            <span className="text-xs text-amber-600">
              {liveNowMatches.length} {liveNowMatches.length === 1 ? "jogo" : "jogos"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
            {liveNowMatches.map((m) => (
              <MatchCard key={`live-${m.id}`} match={m} showAutoSync />
            ))}
          </div>
          <p className="text-[10px] text-amber-700/80 mt-2">
            🔄 Auto ESPN puxa o placar a cada {ESPN_POLL_MS / 1000}s e salva sozinho. Nunca zera nem diminui placar; só grava Ao Vivo/Finalizado.
          </p>
        </div>
      )}

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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div
          className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-3"
          style={{ paddingTop: "12px", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
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
