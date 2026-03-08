import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: fetch all users with payment status and bank details (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { role: "user" },
    include: {
      payment: true,
      bankDetails: true,
    },
    orderBy: { name: "asc" },
  });

  const result = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    paid: user.payment?.paid ?? false,
    paidAt: user.payment?.paidAt ?? null,
    bankDetails: user.bankDetails
      ? {
          fullName: user.bankDetails.fullName,
          cpf: user.bankDetails.cpf,
          bank: user.bankDetails.bank,
          agency: user.bankDetails.agency,
          account: user.bankDetails.account,
          pix: user.bankDetails.pix,
        }
      : null,
  }));

  return NextResponse.json(result);
}

// POST: mark user as paid/unpaid (admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, paid } = body as { userId: string; paid: boolean };

    if (!userId || typeof paid !== "boolean") {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.upsert({
      where: { userId },
      update: {
        paid,
        paidAt: paid ? new Date() : null,
        markedBy: session.user.id,
      },
      create: {
        userId,
        paid,
        paidAt: paid ? new Date() : null,
        markedBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar pagamento" },
      { status: 500 }
    );
  }
}
