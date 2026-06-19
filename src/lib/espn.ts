/**
 * ESPN hidden API integration (read-only).
 *
 * ESPN exposes a public, key-less JSON scoreboard for the FIFA World Cup:
 *   https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
 *
 * We use it ONLY to read live scores. The pool's team codes are in Portuguese
 * (COR, CAT, AFS…) while ESPN uses FIFA-style abbreviations (KOR, QAT, RSA…),
 * so POOL_TO_ESPN translates between them. Placeholder slots (UD/UA/…/IC1/IC2)
 * are intentionally left unmapped: if a team can't be mapped, the sync simply
 * reports "not found" and never writes anything.
 */

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

/** Pool team code → ESPN abbreviation. Covers all 42 real teams.
 *  Identity entries for the 6 playoff slots are harmless fallbacks in case the
 *  admin recoded a placeholder row to a real ESPN-style abbreviation. */
export const POOL_TO_ESPN: Record<string, string> = {
  MEX: "MEX", AFS: "RSA", COR: "KOR",
  CAN: "CAN", SUI: "SUI", CAT: "QAT",
  BRA: "BRA", MAR: "MAR", HAI: "HAI", ESC: "SCO",
  EUA: "USA", PAR: "PAR", AUS: "AUS",
  ALE: "GER", CUR: "CUW", CMF: "CIV", EQU: "ECU",
  HOL: "NED", JAP: "JPN", TUN: "TUN",
  BEL: "BEL", EGI: "EGY", IRA: "IRN", NZE: "NZL",
  ESP: "ESP", CPV: "CPV", SAU: "KSA", URU: "URU",
  FRA: "FRA", SEN: "SEN", NOR: "NOR",
  ARG: "ARG", ALG: "ALG", AUT: "AUT", JOR: "JOR",
  POR: "POR", UZB: "UZB", COL: "COL",
  ING: "ENG", CRO: "CRO", GAN: "GHA", PAN: "PAN",
  // Confirmed playoff resolutions (group A/B, 18/06)
  UD: "CZE", UA: "BIH",
  // Identity fallbacks (only match same team; no risk of a wrong match)
  CZE: "CZE", BIH: "BIH", SWE: "SWE", TUR: "TUR", IRQ: "IRQ", COD: "COD",
};

export interface EspnMatch {
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  state: "pre" | "in" | "post";
  detail: string; // e.g. "HT", "FT", "63'"
}

interface EspnCompetitor {
  homeAway: string;
  score?: string;
  team?: { abbreviation?: string };
}

/** Format a Date as YYYYMMDD in UTC. */
function ymd(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

/** Candidate query dates: the match's nominal date plus "now", so a live game
 *  is found even if the stored kickoff date drifts by a few hours. */
export function candidateDates(matchDate: Date): string[] {
  const now = new Date();
  const set = new Set<string>([ymd(matchDate), ymd(now)]);
  return [...set];
}

/** Fetch and parse ESPN's scoreboard for a single YYYYMMDD date. */
export async function fetchEspnByDate(date: string): Promise<EspnMatch[]> {
  const res = await fetch(`${ESPN_SCOREBOARD}?dates=${date}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  const events: unknown[] = data?.events ?? [];
  const out: EspnMatch[] = [];

  for (const ev of events as Record<string, unknown>[]) {
    const comp = (ev.competitions as Record<string, unknown>[] | undefined)?.[0];
    if (!comp) continue;
    const competitors = (comp.competitors as EspnCompetitor[] | undefined) ?? [];
    let home: EspnCompetitor | undefined;
    let away: EspnCompetitor | undefined;
    for (const c of competitors) {
      if (c.homeAway === "home") home = c;
      else if (c.homeAway === "away") away = c;
    }
    if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue;

    const status = (comp.status as Record<string, unknown>) ?? {};
    const type = (status.type as Record<string, unknown>) ?? {};
    const state = (type.state as "pre" | "in" | "post") ?? "pre";
    const detail = String(type.shortDetail ?? status.displayClock ?? "");

    out.push({
      homeAbbr: home.team.abbreviation,
      awayAbbr: away.team.abbreviation,
      homeScore: parseInt(home.score ?? "", 10),
      awayScore: parseInt(away.score ?? "", 10),
      state,
      detail,
    });
  }
  return out;
}

export interface EspnScoreResult {
  found: boolean;
  reason?: string;
  homeScore?: number;
  awayScore?: number;
  /** Pool-facing status derived from ESPN state. Never "SCHEDULED". */
  status?: "LIVE" | "FINISHED";
  detail?: string;
}

/**
 * Look up the live score for a pool match identified by its home/away codes.
 * Scores are oriented to the POOL's home/away (not ESPN's), by matching team
 * identity. Returns found:false (and writes nothing) when the teams can't be
 * mapped, the game isn't on ESPN yet, or it hasn't kicked off (state "pre").
 */
export async function lookupEspnScore(
  homeCode: string,
  awayCode: string,
  matchDate: Date,
): Promise<EspnScoreResult> {
  const homeEspn = POOL_TO_ESPN[homeCode];
  const awayEspn = POOL_TO_ESPN[awayCode];
  if (!homeEspn || !awayEspn) {
    return { found: false, reason: "Time sem mapeamento ESPN (placeholder?)" };
  }

  for (const date of candidateDates(matchDate)) {
    const matches = await fetchEspnByDate(date);
    for (const m of matches) {
      const sameOrientation = m.homeAbbr === homeEspn && m.awayAbbr === awayEspn;
      const flipped = m.homeAbbr === awayEspn && m.awayAbbr === homeEspn;
      if (!sameOrientation && !flipped) continue;

      // Orient scores to the pool's home/away by team identity.
      const poolHomeScore = sameOrientation ? m.homeScore : m.awayScore;
      const poolAwayScore = sameOrientation ? m.awayScore : m.homeScore;

      if (m.state === "pre") {
        return { found: false, reason: "Jogo ainda não começou na ESPN" };
      }
      if (Number.isNaN(poolHomeScore) || Number.isNaN(poolAwayScore)) {
        return { found: false, reason: "ESPN sem placar numérico" };
      }
      return {
        found: true,
        homeScore: poolHomeScore,
        awayScore: poolAwayScore,
        status: m.state === "post" ? "FINISHED" : "LIVE",
        detail: m.detail,
      };
    }
  }
  return { found: false, reason: "Jogo não encontrado na ESPN" };
}
