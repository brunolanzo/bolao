import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { POOL_TO_ESPN, fetchEspnByDate, type EspnMatch } from "@/lib/espn";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/sync-times?secret=<CRON_SECRET>
 *
 * Corrects each match's stored kickoff (matchDate) to the REAL kickoff time
 * published by ESPN. Every match is seeded at a placeholder 18:00 UTC, which
 * (a) makes knockout prediction deadlines close at the wrong time and (b) can
 * push a game outside the live-score detection window. Reading the real time
 * fixes both.
 *
 * SAFETY — this endpoint only ever writes `matchDate`. It never touches scores,
 * status, points, predictions or any other field. Group prediction deadlines
 * use the GROUP_DEADLINE setting (not matchDate), so they are unaffected.
 *
 * Idempotent and safe to re-run: it only writes when the real kickoff differs
 * from what's stored by more than a minute, and ignores ESPN times that fall
 * absurdly far (> 4 days) from the stored date as a sanity guard.
 *
 * Re-run it whenever new knockout fixtures get their teams assigned (ESPN can
 * only match a game once both team abbreviations are known).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  // dryRun=1 reports what WOULD change without writing anything — use it to
  // preview the diff before applying.
  const dryRun = searchParams.get("dryRun") === "1";

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Only matches whose teams are known and that haven't finished — those are the
  // ones whose kickoff still matters for deadlines and live detection.
  const matches = await prisma.match.findMany({
    where: {
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      status: { not: "FINISHED" },
    },
    include: { homeTeam: true, awayTeam: true },
  });

  if (matches.length === 0) {
    return NextResponse.json({ ok: true, message: "Nenhum jogo a sincronizar", updated: 0 });
  }

  // YYYYMMDD (UTC) of a Date — ESPN groups its scoreboard by this "matchday".
  const ymd = (d: Date) =>
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0");

  // ESPN groups its scoreboard by "matchday", and a game that kicks off after
  // UTC midnight is listed under the PREVIOUS day's matchday. So for each stored
  // date we also fetch the day before/after and search across all of them — this
  // keeps the sync robust (and idempotent) for late-night knockout kickoffs.
  const shiftDay = (date: string, days: number) => {
    const d = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return ymd(d);
  };
  const wantedDates = new Set<string>();
  for (const m of matches) {
    const base = ymd(new Date(m.matchDate));
    wantedDates.add(shiftDay(base, -1));
    wantedDates.add(base);
    wantedDates.add(shiftDay(base, 1));
  }
  const allEvents: EspnMatch[] = [];
  for (const date of wantedDates) {
    allEvents.push(...(await fetchEspnByDate(date)));
  }

  const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
  const results: { matchId: string; result: string }[] = [];
  let updated = 0;

  for (const match of matches) {
    const homeEspn = POOL_TO_ESPN[match.homeTeam!.code];
    const awayEspn = POOL_TO_ESPN[match.awayTeam!.code];
    if (!homeEspn || !awayEspn) {
      results.push({ matchId: match.id, result: "time sem mapeamento ESPN" });
      continue;
    }

    const stored = new Date(match.matchDate);
    // Match the team pair (orientation-independent). If the pair shows up more
    // than once across the fetched window, take the kickoff closest to stored.
    const candidates = allEvents.filter(
      (e) =>
        e.kickoff &&
        ((e.homeAbbr === homeEspn && e.awayAbbr === awayEspn) ||
          (e.homeAbbr === awayEspn && e.awayAbbr === homeEspn)),
    );
    if (candidates.length === 0) {
      results.push({ matchId: match.id, result: "não encontrado na ESPN" });
      continue;
    }
    const ev = candidates.reduce((best, e) =>
      Math.abs(new Date(e.kickoff).getTime() - stored.getTime()) <
      Math.abs(new Date(best.kickoff).getTime() - stored.getTime())
        ? e
        : best,
    );

    const real = new Date(ev.kickoff);
    if (isNaN(real.getTime())) {
      results.push({ matchId: match.id, result: "kickoff ESPN inválido" });
      continue;
    }

    const diffMs = Math.abs(real.getTime() - stored.getTime());
    if (diffMs > FOUR_DAYS) {
      results.push({ matchId: match.id, result: `ignorado: ESPN ${ev.kickoff} longe demais` });
      continue;
    }
    if (diffMs < 60 * 1000) {
      results.push({ matchId: match.id, result: "já correto" });
      continue;
    }

    if (!dryRun) {
      await prisma.match.update({
        where: { id: match.id },
        data: { matchDate: real },
      });
    }
    updated++;
    results.push({
      matchId: match.id,
      result: `${dryRun ? "[dryRun] mudaria" : "atualizado"} ${stored.toISOString()} → ${real.toISOString()}`,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    checkedAt: new Date().toISOString(),
    candidates: matches.length,
    updated,
    results,
  });
}
