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

  // Fetch each distinct matchday once, then match locally (cheap on ESPN).
  const distinctDates = [...new Set(matches.map((m) => ymd(new Date(m.matchDate))))];
  const byDate = new Map<string, EspnMatch[]>();
  for (const date of distinctDates) {
    byDate.set(date, await fetchEspnByDate(date));
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
    const events = byDate.get(ymd(stored)) ?? [];
    // Orientation doesn't matter for the kickoff time — match the team pair.
    const ev = events.find(
      (e) =>
        (e.homeAbbr === homeEspn && e.awayAbbr === awayEspn) ||
        (e.homeAbbr === awayEspn && e.awayAbbr === homeEspn),
    );

    if (!ev || !ev.kickoff) {
      results.push({ matchId: match.id, result: "não encontrado na ESPN" });
      continue;
    }

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
