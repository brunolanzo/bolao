import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/fix-knockout-dates?secret=<CRON_SECRET>[&dryRun=1]
 *
 * One-time correction of every knockout match date/time (ROUND_32 → FINAL) to
 * FIFA's official schedule. The seed used rough, date-only placeholders; this
 * sets the real kickoff instant for each match.
 *
 * FIFA publishes these in horário de Brasília (UTC−3, no DST). We store the
 * absolute UTC instant (BRT + 3h) so deadlines, "próximo jogo", live detection
 * and every display are correct regardless of server timezone. Displays render
 * back in America/Sao_Paulo.
 *
 * SAFETY: writes ONLY matchDate. Never touches teams, scores, status, points,
 * predictions or bets. Idempotent (sets absolute values; skips if already
 * correct) and guarded by expected phase per matchOrder.
 */

// matchOrder → { phase (guard), iso (UTC instant of the BRT kickoff) }
// Times below are FIFA's Brasília times already converted to UTC (+3h).
const SCHEDULE: { order: number; phase: string; iso: string; brt: string }[] = [
  // ROUND_32 (16 avos)
  { order: 73, phase: "ROUND_32", iso: "2026-06-28T19:00:00Z", brt: "28/06 16:00" },
  { order: 74, phase: "ROUND_32", iso: "2026-06-29T20:30:00Z", brt: "29/06 17:30" },
  { order: 75, phase: "ROUND_32", iso: "2026-06-30T01:00:00Z", brt: "29/06 22:00" },
  { order: 76, phase: "ROUND_32", iso: "2026-06-29T17:00:00Z", brt: "29/06 14:00" },
  { order: 77, phase: "ROUND_32", iso: "2026-06-30T21:00:00Z", brt: "30/06 18:00" },
  { order: 78, phase: "ROUND_32", iso: "2026-06-30T17:00:00Z", brt: "30/06 14:00" },
  { order: 79, phase: "ROUND_32", iso: "2026-07-01T01:00:00Z", brt: "30/06 22:00" },
  { order: 80, phase: "ROUND_32", iso: "2026-07-01T16:00:00Z", brt: "01/07 13:00" },
  { order: 81, phase: "ROUND_32", iso: "2026-07-02T00:00:00Z", brt: "01/07 21:00" },
  { order: 82, phase: "ROUND_32", iso: "2026-07-01T20:00:00Z", brt: "01/07 17:00" },
  { order: 83, phase: "ROUND_32", iso: "2026-07-02T23:00:00Z", brt: "02/07 20:00" },
  { order: 84, phase: "ROUND_32", iso: "2026-07-02T19:00:00Z", brt: "02/07 16:00" },
  { order: 85, phase: "ROUND_32", iso: "2026-07-03T03:00:00Z", brt: "03/07 00:00" },
  { order: 86, phase: "ROUND_32", iso: "2026-07-03T22:00:00Z", brt: "03/07 19:00" },
  { order: 87, phase: "ROUND_32", iso: "2026-07-04T01:30:00Z", brt: "03/07 22:30" },
  { order: 88, phase: "ROUND_32", iso: "2026-07-03T18:00:00Z", brt: "03/07 15:00" },
  // ROUND_16 (oitavas)
  { order: 89, phase: "ROUND_16", iso: "2026-07-04T21:00:00Z", brt: "04/07 18:00" },
  { order: 90, phase: "ROUND_16", iso: "2026-07-04T17:00:00Z", brt: "04/07 14:00" },
  { order: 91, phase: "ROUND_16", iso: "2026-07-05T20:00:00Z", brt: "05/07 17:00" },
  { order: 92, phase: "ROUND_16", iso: "2026-07-06T00:00:00Z", brt: "05/07 21:00" },
  { order: 93, phase: "ROUND_16", iso: "2026-07-06T19:00:00Z", brt: "06/07 16:00" },
  { order: 94, phase: "ROUND_16", iso: "2026-07-07T00:00:00Z", brt: "06/07 21:00" },
  { order: 95, phase: "ROUND_16", iso: "2026-07-07T16:00:00Z", brt: "07/07 13:00" },
  { order: 96, phase: "ROUND_16", iso: "2026-07-07T20:00:00Z", brt: "07/07 17:00" },
  // QUARTERS (quartas)
  { order: 97, phase: "QUARTERS", iso: "2026-07-09T20:00:00Z", brt: "09/07 17:00" },
  { order: 98, phase: "QUARTERS", iso: "2026-07-10T19:00:00Z", brt: "10/07 16:00" },
  { order: 99, phase: "QUARTERS", iso: "2026-07-11T21:00:00Z", brt: "11/07 18:00" },
  { order: 100, phase: "QUARTERS", iso: "2026-07-12T01:00:00Z", brt: "11/07 22:00" },
  // SEMIS (semifinais)
  { order: 101, phase: "SEMIS", iso: "2026-07-14T19:00:00Z", brt: "14/07 16:00" },
  { order: 102, phase: "SEMIS", iso: "2026-07-15T19:00:00Z", brt: "15/07 16:00" },
  // THIRD_PLACE (3º lugar)
  { order: 103, phase: "THIRD_PLACE", iso: "2026-07-18T21:00:00Z", brt: "18/07 18:00" },
  // FINAL
  { order: 104, phase: "FINAL", iso: "2026-07-19T19:00:00Z", brt: "19/07 16:00" },
];

function fmtBrt(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  const dryRun = searchParams.get("dryRun") === "1";

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const orders = SCHEDULE.map((s) => s.order);
  const matches = await prisma.match.findMany({
    where: { matchOrder: { in: orders } },
    select: { id: true, matchOrder: true, phase: true, matchDate: true },
  });
  const byOrder = new Map(matches.map((m) => [m.matchOrder, m]));

  // Structural + phase guard.
  const problems: string[] = [];
  for (const s of SCHEDULE) {
    const m = byOrder.get(s.order);
    if (!m) problems.push(`J${s.order}: não encontrado`);
    else if (m.phase !== s.phase) problems.push(`J${s.order}: fase ${m.phase}, esperava ${s.phase}`);
  }
  const guardOk = problems.length === 0;

  const changes = SCHEDULE.map((s) => {
    const m = byOrder.get(s.order);
    const target = new Date(s.iso);
    const current = m ? new Date(m.matchDate) : null;
    const diffMs = current ? Math.abs(target.getTime() - current.getTime()) : Infinity;
    return {
      matchOrder: s.order,
      phase: s.phase,
      currentBrt: current ? fmtBrt(current) : "—",
      newBrt: `${fmtBrt(target)} (FIFA ${s.brt})`,
      willChange: diffMs >= 60 * 1000,
    };
  });

  if (dryRun || !guardOk) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      guardOk,
      problems,
      message: guardOk
        ? "Pré-visualização — nada gravado. Rode sem dryRun para aplicar."
        : "Guarda falhou (fase/ordem inesperada) — nada será gravado.",
      changes,
    });
  }

  let updated = 0;
  for (const s of SCHEDULE) {
    const m = byOrder.get(s.order)!;
    const target = new Date(s.iso);
    if (Math.abs(target.getTime() - new Date(m.matchDate).getTime()) < 60 * 1000) continue;
    await prisma.match.update({ where: { id: m.id }, data: { matchDate: target } });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    guardOk: true,
    updated,
    message: `Datas/horários do mata-mata atualizados: ${updated} jogos (somente matchDate).`,
    changes,
  });
}
