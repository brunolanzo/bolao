import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/delete-user
 * Body: { userId: string }
 *
 * Permanently deletes a participant and all of their data.
 * Cascade deletes (via schema onDelete: Cascade) handle:
 *   - MatchPrediction, PhasePrediction, ChampionPrediction
 *   - Payment, BankDetails
 * We additionally remove the user's saved bracket state, which lives
 * in the Settings table under the key `BRACKET_<userId>`.
 *
 * Guards: admin-only, cannot delete an admin, cannot delete yourself.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { userId } = (await request.json()) as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode excluir a si mesmo." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Não é possível excluir um administrador." },
        { status: 400 }
      );
    }

    // Remove the user's saved bracket (not covered by cascade — lives in Settings).
    await prisma.settings.deleteMany({ where: { key: `BRACKET_${userId}` } });

    // Cascade handles predictions, payment and bank details.
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      ok: true,
      message: `Usuário "${target.name}" excluído com sucesso.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao excluir usuário.", detail: String(err) },
      { status: 500 }
    );
  }
}
