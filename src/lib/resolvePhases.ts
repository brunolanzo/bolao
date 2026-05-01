import { prisma } from "@/lib/prisma";
import {
  PHASE_POINTS,
  CHAMPION_POINTS,
  RUNNER_UP_POINTS,
  THIRD_PLACE_POINTS,
} from "@/lib/scoring";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

// ─── Bracket cascade configuration ────────────────────────────────────────────
// Maps each knockout target match to which previous-phase matches feed it.
// Indexes refer to phase-relative position (0-based, by matchOrder asc).
type FeederKind = "winner" | "loser";
interface Feeder { from: string; idx: number; kind?: FeederKind }
interface CascadeEntry { home: Feeder; away: Feeder }

const CASCADE: { phase: string; entries: CascadeEntry[] }[] = [
  { phase: "ROUND_16", entries: [
    { home: { from: "ROUND_32", idx: 1  }, away: { from: "ROUND_32", idx: 4  } }, // M89
    { home: { from: "ROUND_32", idx: 0  }, away: { from: "ROUND_32", idx: 2  } }, // M90
    { home: { from: "ROUND_32", idx: 3  }, away: { from: "ROUND_32", idx: 5  } }, // M91
    { home: { from: "ROUND_32", idx: 6  }, away: { from: "ROUND_32", idx: 7  } }, // M92
    { home: { from: "ROUND_32", idx: 10 }, away: { from: "ROUND_32", idx: 11 } }, // M93
    { home: { from: "ROUND_32", idx: 8  }, away: { from: "ROUND_32", idx: 9  } }, // M94
    { home: { from: "ROUND_32", idx: 13 }, away: { from: "ROUND_32", idx: 15 } }, // M95
    { home: { from: "ROUND_32", idx: 12 }, away: { from: "ROUND_32", idx: 14 } }, // M96
  ]},
  { phase: "QUARTERS", entries: [
    { home: { from: "ROUND_16", idx: 0 }, away: { from: "ROUND_16", idx: 1 } },
    { home: { from: "ROUND_16", idx: 2 }, away: { from: "ROUND_16", idx: 3 } },
    { home: { from: "ROUND_16", idx: 4 }, away: { from: "ROUND_16", idx: 5 } },
    { home: { from: "ROUND_16", idx: 6 }, away: { from: "ROUND_16", idx: 7 } },
  ]},
  { phase: "SEMIS", entries: [
    { home: { from: "QUARTERS", idx: 0 }, away: { from: "QUARTERS", idx: 1 } },
    { home: { from: "QUARTERS", idx: 2 }, away: { from: "QUARTERS", idx: 3 } },
  ]},
  { phase: "FINAL", entries: [
    { home: { from: "SEMIS", idx: 0, kind: "winner" }, away: { from: "SEMIS", idx: 1, kind: "winner" } },
  ]},
  { phase: "THIRD_PLACE", entries: [
    { home: { from: "SEMIS", idx: 0, kind: "loser" }, away: { from: "SEMIS", idx: 1, kind: "loser" } },
  ]},
];

interface MatchLite {
  id: string;
  phase: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: string;
}

/** Determine winner of a match. Uses penalties when scores are tied. Returns null if undecided. */
function getWinner(m: MatchLite): string | null {
  if (m.status !== "FINISHED") return null;
  if (m.homeScore === null || m.awayScore === null) return null;
  if (!m.homeTeamId || !m.awayTeamId) return null;
  if (m.homeScore > m.awayScore) return m.homeTeamId;
  if (m.awayScore > m.homeScore) return m.awayTeamId;
  // Tied — use penalties
  if (m.homePenalties !== null && m.awayPenalties !== null) {
    if (m.homePenalties > m.awayPenalties) return m.homeTeamId;
    if (m.awayPenalties > m.homePenalties) return m.awayTeamId;
  }
  return null;
}

function getLoser(m: MatchLite): string | null {
  const winner = getWinner(m);
  if (!winner) return null;
  return winner === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
}

/**
 * Propagate winners (and losers, for the third-place playoff) from each
 * knockout phase into the homeTeamId / awayTeamId of the next phase's matches.
 * Idempotent: re-runs safely after every save.
 */
export async function cascadeBracket() {
  const matches = await prisma.match.findMany({ orderBy: { matchOrder: "asc" } });
  const byPhase: Record<string, typeof matches> = {};
  for (const m of matches) {
    if (!byPhase[m.phase]) byPhase[m.phase] = [];
    byPhase[m.phase].push(m);
  }

  for (const c of CASCADE) {
    const targets = byPhase[c.phase] ?? [];
    if (targets.length !== c.entries.length) continue;
    for (let i = 0; i < c.entries.length; i++) {
      const t = targets[i];
      const e = c.entries[i];
      const sourceA = byPhase[e.home.from]?.[e.home.idx];
      const sourceB = byPhase[e.away.from]?.[e.away.idx];
      const homeId = sourceA
        ? (e.home.kind === "loser" ? getLoser(sourceA) : getWinner(sourceA))
        : null;
      const awayId = sourceB
        ? (e.away.kind === "loser" ? getLoser(sourceB) : getWinner(sourceB))
        : null;
      if (t.homeTeamId !== homeId || t.awayTeamId !== awayId) {
        await prisma.match.update({
          where: { id: t.id },
          data: { homeTeamId: homeId, awayTeamId: awayId },
        });
      }
    }
  }
}

interface Standing {
  teamId: string;
  group: string;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

function compareStanding(a: Standing, b: Standing) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId);
}

/**
 * Compute actual qualifiers per phase from real match results, then
 * resolve every PhasePrediction's `correct`/`points` field accordingly.
 *
 * Resolution policy:
 * - If we definitively know team T qualified to phase P → correct=true, points=PHASE_POINTS[P]
 * - If phase P is *fully resolved* (all feeder matches FINISHED) and T not in qualifiers → correct=false, points=0
 * - Otherwise → correct=null, points=null (still pending)
 *
 * Also resolves ChampionPrediction (champion, runner-up, third).
 */
export async function resolvePhases() {
  // First propagate winners through the bracket so subsequent matches
  // have the correct homeTeamId/awayTeamId before we evaluate predictions.
  await cascadeBracket();

  const matches = await prisma.match.findMany();
  const teams = await prisma.team.findMany();

  // ── Group standings ──
  const stats = new Map<string, Standing>();
  for (const t of teams) {
    stats.set(t.id, {
      teamId: t.id, group: t.groupLabel,
      played: 0, points: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0,
    });
  }
  for (const m of matches) {
    if (m.phase !== "GROUP") continue;
    if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const h = stats.get(m.homeTeamId);
    const a = stats.get(m.awayTeamId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.goalsFor += m.homeScore; h.goalsAgainst += m.awayScore;
    a.goalsFor += m.awayScore; a.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) h.points += 3;
    else if (m.homeScore < m.awayScore) a.points += 3;
    else { h.points++; a.points++; }
  }
  for (const s of stats.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;

  const standingsByGroup: Record<string, Standing[]> = {};
  for (const g of GROUPS) standingsByGroup[g] = [];
  for (const s of stats.values()) {
    if (standingsByGroup[s.group]) standingsByGroup[s.group].push(s);
  }
  for (const g of GROUPS) standingsByGroup[g].sort(compareStanding);

  // ── Qualifiers per phase ──
  const qualifiers: Record<string, Set<string>> = {
    ROUND_32: new Set(),
    ROUND_16: new Set(),
    QUARTERS: new Set(),
    SEMIS: new Set(),
    FINAL: new Set(),
  };

  const groupMatches = matches.filter((m) => m.phase === "GROUP");
  const allGroupsFinished =
    groupMatches.length > 0 && groupMatches.every((m) => m.status === "FINISHED");

  if (allGroupsFinished) {
    // Top 2 per group
    for (const g of GROUPS) {
      if (standingsByGroup[g][0]) qualifiers.ROUND_32.add(standingsByGroup[g][0].teamId);
      if (standingsByGroup[g][1]) qualifiers.ROUND_32.add(standingsByGroup[g][1].teamId);
    }
    // 8 best thirds
    const allThirds = GROUPS
      .map((g) => standingsByGroup[g][2])
      .filter((s): s is Standing => !!s);
    allThirds.sort(compareStanding);
    for (const t of allThirds.slice(0, 8)) qualifiers.ROUND_32.add(t.teamId);
  }

  // For knockout phases, winners of FINISHED matches in previous phase advance.
  // getWinner uses penalties to break ties when needed.
  for (const m of matches) {
    let nextPhase: string | null = null;
    if (m.phase === "ROUND_32") nextPhase = "ROUND_16";
    else if (m.phase === "ROUND_16") nextPhase = "QUARTERS";
    else if (m.phase === "QUARTERS") nextPhase = "SEMIS";
    else if (m.phase === "SEMIS") nextPhase = "FINAL";
    if (!nextPhase) continue;
    const winner = getWinner(m);
    if (winner) qualifiers[nextPhase].add(winner);
  }

  // ── Fully-resolved checks ──
  const isFully = (phase: string, expectedFeeders: number, feederPhase: string) => {
    const feeders = matches.filter((m) => m.phase === feederPhase);
    return feeders.length === expectedFeeders && feeders.every((m) => m.status === "FINISHED");
  };
  const fullyResolved: Record<string, boolean> = {
    ROUND_32: allGroupsFinished,
    ROUND_16: isFully("ROUND_16", 16, "ROUND_32"),
    QUARTERS: isFully("QUARTERS", 8, "ROUND_16"),
    SEMIS: isFully("SEMIS", 4, "QUARTERS"),
    FINAL: isFully("FINAL", 2, "SEMIS"),
  };

  // ── Update PhasePredictions ──
  const phasesToResolve = ["ROUND_32", "ROUND_16", "QUARTERS", "SEMIS", "FINAL"] as const;
  for (const phase of phasesToResolve) {
    const qualified = qualifiers[phase];
    const isFullyResolved = fullyResolved[phase];
    const preds = await prisma.phasePrediction.findMany({ where: { phase } });
    for (const pred of preds) {
      let correct: boolean | null;
      let points: number | null;
      if (qualified.has(pred.teamId)) {
        correct = true;
        points = PHASE_POINTS[phase] ?? 0;
      } else if (isFullyResolved) {
        correct = false;
        points = 0;
      } else {
        correct = null;
        points = null;
      }
      if (pred.correct !== correct || pred.points !== points) {
        await prisma.phasePrediction.update({
          where: { id: pred.id },
          data: { correct, points },
        });
      }
    }
  }

  // ── ChampionPrediction (champion, runner-up, third) ──
  const finalMatch = matches.find((m) => m.phase === "FINAL");
  const thirdPlaceMatch = matches.find((m) => m.phase === "THIRD_PLACE");

  let actualChamp: string | null = null;
  let actualRunnerUp: string | null = null;
  let actualThird: string | null = null;

  if (finalMatch) {
    actualChamp = getWinner(finalMatch);
    if (actualChamp) {
      actualRunnerUp = actualChamp === finalMatch.homeTeamId
        ? finalMatch.awayTeamId
        : finalMatch.homeTeamId;
    }
  }

  if (thirdPlaceMatch) {
    actualThird = getWinner(thirdPlaceMatch);
  }

  const cps = await prisma.championPrediction.findMany();
  for (const cp of cps) {
    const champPts = actualChamp ? (cp.championTeamId === actualChamp ? CHAMPION_POINTS : 0) : null;
    const runnerPts = actualRunnerUp ? (cp.runnerUpTeamId === actualRunnerUp ? RUNNER_UP_POINTS : 0) : null;
    const thirdPts = actualThird ? (cp.thirdPlaceTeamId === actualThird ? THIRD_PLACE_POINTS : 0) : null;
    if (
      cp.championPoints !== champPts ||
      cp.runnerUpPoints !== runnerPts ||
      cp.thirdPlacePoints !== thirdPts
    ) {
      await prisma.championPrediction.update({
        where: { id: cp.id },
        data: {
          championPoints: champPts,
          runnerUpPoints: runnerPts,
          thirdPlacePoints: thirdPts,
        },
      });
    }
  }
}
