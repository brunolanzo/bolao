import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/fix-r32-bracket?secret=<CRON_SECRET>[&dryRun=1]
 *
 * One-time correction of the Round-of-32 (Segunda Fase) bracket. The
 * auto-bracket's bipartite matching placed 6 third-placed teams into a VALID
 * but non-official set of slots — different from FIFA's published allocation
 * table. The home teams (group winners) are all correct; only the 6 away
 * (third-placed) teams need to be permuted among these 6 matches.
 *
 * Correct (FIFA) bracket — only the away team changes per match:
 *   J74 GER x PAR   J77 FRA x SWE   J79 MEX x EQU
 *   J81 USA x BIH   J82 BEL x SEN   J85 SUI x ALG
 *
 * Strategy — permute the away teams BY REFERENCE (no hardcoded codes/names):
 * each target match's new away team is whichever team currently sits in a
 * known source match. Since the 6 teams are exactly the same set, just in the
 * wrong slots, this is a pure 6-cycle reshuffle.
 *
 * SAFETY:
 *  - Writes ONLY awayTeamId on these 6 matches. Never touches homeTeamId,
 *    scores, status, points, PhasePredictions, ChampionPredictions or any
 *    MatchPrediction (bets already placed are preserved untouched).
 *  - Guard: refuses to write unless the current state matches the reported
 *    wrong bracket (the 4 certain away codes PAR/SEN/EQU/ALG sit in their
 *    wrong slots). If the bracket is already correct or in an unexpected
 *    state, it reports and writes nothing — so it can't scramble a good
 *    bracket or be applied twice.
 *  - Changing the away team does NOT change who is in ROUND_32 (the same 6
 *    thirds remain qualified), so phase/champion points are unaffected.
 *
 * Run dryRun first to inspect, then without dryRun to apply.
 */

// Target matches (by matchOrder) and, for each, the source match whose current
// away team should become this match's away team.
const AWAY_SOURCE: Record<number, number> = {
  74: 77, // PAR  (currently in J77)
  77: 85, // SWE  (currently in J85)
  79: 81, // EQU  (currently in J81)
  81: 74, // BIH  (currently in J74)
  82: 79, // SEN  (currently in J79)
  85: 82, // ALG  (currently in J82)
};

// Anchors: away-team codes we KNOW must be present (in their wrong slots) for
// the current state to match the reported wrong bracket. These 4 codes are
// stable (real teams in the seed). SWE/BIH come via playoffs (UB/UA) so we
// don't anchor on them — they're moved purely by reference.
const EXPECTED_WRONG_AWAY: Record<number, string> = {
  77: "PAR",
  79: "SEN",
  81: "EQU",
  82: "ALG",
};

const TARGET_ORDERS = [74, 77, 79, 81, 82, 85];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  const dryRun = searchParams.get("dryRun") === "1";

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: { phase: "ROUND_32", matchOrder: { in: TARGET_ORDERS } },
    include: {
      homeTeam: { select: { id: true, code: true, name: true } },
      awayTeam: { select: { id: true, code: true, name: true } },
      _count: { select: { predictions: true } },
    },
  });

  const byOrder = new Map(matches.map((m) => [m.matchOrder, m]));

  // Structural checks
  const missing = TARGET_ORDERS.filter((o) => !byOrder.has(o));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Jogos não encontrados (matchOrder): ${missing.join(", ")}` },
      { status: 404 },
    );
  }
  const noAway = TARGET_ORDERS.filter((o) => !byOrder.get(o)!.awayTeamId);
  if (noAway.length > 0) {
    return NextResponse.json(
      { error: `Jogos sem time visitante definido: ${noAway.join(", ")}` },
      { status: 409 },
    );
  }
  const awayIds = TARGET_ORDERS.map((o) => byOrder.get(o)!.awayTeamId!);
  if (new Set(awayIds).size !== awayIds.length) {
    return NextResponse.json(
      { error: "Times visitantes repetidos entre os 6 jogos — estado inesperado, abortado." },
      { status: 409 },
    );
  }

  // Guard: current away codes must match the reported wrong bracket.
  const guardFailures: string[] = [];
  for (const [orderStr, code] of Object.entries(EXPECTED_WRONG_AWAY)) {
    const order = Number(orderStr);
    const actual = byOrder.get(order)!.awayTeam?.code;
    if (actual !== code) {
      guardFailures.push(`J${order}: esperava visitante ${code}, encontrou ${actual ?? "—"}`);
    }
  }
  const guardOk = guardFailures.length === 0;

  // Build the proposed changes.
  const changes = TARGET_ORDERS.map((order) => {
    const m = byOrder.get(order)!;
    const source = byOrder.get(AWAY_SOURCE[order])!;
    return {
      matchOrder: order,
      home: m.homeTeam ? `${m.homeTeam.name} (${m.homeTeam.code})` : "—",
      currentAway: m.awayTeam ? `${m.awayTeam.name} (${m.awayTeam.code})` : "—",
      newAway: source.awayTeam ? `${source.awayTeam.name} (${source.awayTeam.code})` : "—",
      newAwayTeamId: source.awayTeamId!,
      predictionsOnThisMatch: m._count.predictions,
      changes: m.awayTeamId !== source.awayTeamId,
    };
  });

  if (dryRun || !guardOk) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      guardOk,
      guardFailures,
      message: guardOk
        ? "Pré-visualização — nada gravado. Rode sem dryRun para aplicar."
        : "Estado atual NÃO corresponde ao bracket errado reportado — nada será gravado.",
      changes,
    });
  }

  // Apply: write ONLY awayTeamId. Nothing else is touched.
  let updated = 0;
  for (const c of changes) {
    if (!c.changes) continue;
    await prisma.match.update({
      where: { id: byOrder.get(c.matchOrder)!.id },
      data: { awayTeamId: c.newAwayTeamId },
    });
    updated++;
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    guardOk: true,
    updated,
    message: `Bracket da Segunda Fase corrigido: ${updated} jogos atualizados (somente time visitante).`,
    changes,
  });
}
