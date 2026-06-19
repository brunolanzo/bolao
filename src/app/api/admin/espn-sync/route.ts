import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lookupEspnScore } from "@/lib/espn";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/espn-sync?matchId=<id>
 *
 * READ-ONLY. Returns the live score ESPN reports for the given pool match.
 * Writes nothing — the client decides (with its own safety guards) whether to
 * persist via the normal /api/admin/results flow.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId é obrigatório" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }
  if (!match.homeTeam || !match.awayTeam) {
    return NextResponse.json({ found: false, reason: "Times ainda não definidos" });
  }

  const result = await lookupEspnScore(
    match.homeTeam.code,
    match.awayTeam.code,
    new Date(match.matchDate),
  );

  return NextResponse.json(result);
}
