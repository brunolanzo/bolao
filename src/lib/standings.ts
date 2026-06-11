import { fifaRank } from "./fifaRanking";

/**
 * The single source of truth for group-standings ordering, used EVERYWHERE
 * standings are derived — both from user predictions (group tab, bracket tab)
 * and from real results (admin results, auto-bracket, scoring resolution) — so
 * the order is always identical across the whole app.
 *
 * Order of criteria:
 *   1. points
 *   2. goal difference
 *   3. goals scored
 *   4. FIFA World Ranking (lower number = better) — the total-tie tiebreaker
 *   5. team code (deterministic last resort, only when two teams share a rank)
 *
 * Pass each team's `code` so the FIFA-ranking tiebreaker can apply.
 */
export interface StandingMetrics {
  points: number;
  goalDiff: number;
  goalsFor: number;
  code: string;
}

export function compareStandings(a: StandingMetrics, b: StandingMetrics): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  const ra = fifaRank(a.code);
  const rb = fifaRank(b.code);
  if (ra !== rb) return ra - rb;
  return a.code.localeCompare(b.code);
}
