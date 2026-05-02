import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/launch-reset
 *
 * Pre-launch reset — clears users and results while preserving the
 * entire tournament structure, teams, and scoring system.
 *
 * DELETES:
 *   - All MatchPrediction rows
 *   - All PhasePrediction rows
 *   - All ChampionPrediction rows
 *   - All Payment rows
 *   - All BankDetails rows
 *   - All User rows with role "user"
 *
 * RESETS (not deleted):
 *   - Match.homeScore / awayScore / homePenalties / awayPenalties → null
 *   - Match.status → "SCHEDULED"
 *   - Knockout match homeTeamId / awayTeamId → null
 *     (GROUP matches keep their seeded team assignments)
 *
 * UNTOUCHED:
 *   - Admin user
 *   - Team table
 *   - Match structure (matchOrder, phase, groupLabel, matchDate)
 *   - GROUP match homeTeamId / awayTeamId
 *   - Settings table (GROUP_DEADLINE, CURRENT_PHASE, etc.)
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // ── 1. Delete all user-generated data ──────────────────────────
  await prisma.championPrediction.deleteMany();
  await prisma.phasePrediction.deleteMany();
  await prisma.matchPrediction.deleteMany();
  await prisma.bankDetails.deleteMany();
  await prisma.payment.deleteMany();

  // ── 2. Delete all non-admin users ──────────────────────────────
  const { count: usersDeleted } = await prisma.user.deleteMany({
    where: { role: "user" },
  });

  // ── 3. Reset all match scores and statuses ─────────────────────
  await prisma.match.updateMany({
    data: {
      homeScore: null,
      awayScore: null,
      homePenalties: null,
      awayPenalties: null,
      status: "SCHEDULED",
    },
  });

  // ── 4. Clear knockout team assignments (were null post-seed) ────
  //    GROUP phase matches keep their seeded homeTeamId / awayTeamId
  await prisma.match.updateMany({
    where: { phase: { not: "GROUP" } },
    data: {
      homeTeamId: null,
      awayTeamId: null,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Pronto para o launch! ${usersDeleted} usuário(s) removido(s). Todos os resultados e palpites zerados.`,
    detail: {
      usersDeleted,
      preserved: "Times, jogos, settings e sistemática de pontuação intactos.",
    },
  });
}
