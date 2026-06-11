/**
 * FIFA/Coca-Cola Men's World Ranking — snapshot of 1 April 2026.
 * Source: https://inside.fifa.com/fifa-world-ranking/men
 *
 * Keyed by the team `code` used in our database. Lower number = better rank.
 *
 * This is used ONLY as the final tiebreaker for group standings, applied AFTER
 * FIFA's first three criteria (points → goal difference → goals scored). When two
 * teams are tied on all three, the higher FIFA-ranked team is placed ahead. This
 * keeps every standings view in the app (group tab, bracket tab, admin results,
 * scoring resolution) in agreement.
 *
 * Codes not listed here (e.g. still-undecided playoff slots) fall back to
 * FIFA_RANKING_DEFAULT so they sort deterministically last among tied teams.
 */
export const FIFA_RANKING: Record<string, number> = {
  FRA: 1, ESP: 2, ARG: 3, ING: 4, POR: 5, BRA: 6, HOL: 7, MAR: 8, BEL: 9, ALE: 10,
  CRO: 11, COL: 13, SEN: 14, MEX: 15, EUA: 16, URU: 17, JAP: 18, SUI: 19,
  IRA: 21, EQU: 23, AUT: 24, COR: 25, AUS: 27, ALG: 28, EGI: 29, CAN: 30, NOR: 31,
  PAN: 33, CMF: 34, PAR: 40, ESC: 43, TUN: 44, UZB: 50, CAT: 55, AFS: 60, SAU: 61,
  JOR: 63, BIH: 65, CPV: 69, GAN: 74, CUR: 82, HAI: 83, NZE: 85,
};

/** Default rank for teams not in the table (undecided playoff slots, etc.). */
export const FIFA_RANKING_DEFAULT = 999;

/** FIFA ranking position for a team code (lower = better). */
export function fifaRank(code: string): number {
  return FIFA_RANKING[code] ?? FIFA_RANKING_DEFAULT;
}
