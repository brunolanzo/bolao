import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: fetch current user's payment status and bank details
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const payment = await prisma.payment.findUnique({
    where: { userId: session.user.id },
  });

  const bankDetails = await prisma.bankDetails.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    paid: payment?.paid ?? false,
    paidAt: payment?.paidAt ?? null,
    bankDetails: bankDetails
      ? {
          fullName: bankDetails.fullName,
          cpf: bankDetails.cpf,
          bank: bankDetails.bank,
          agency: bankDetails.agency,
          account: bankDetails.account,
          pix: bankDetails.pix,
        }
      : null,
  });
}

// POST: save/update bank details
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fullName, cpf, bank, agency, account, pix } = body as {
      fullName: string;
      cpf: string;
      bank: string;
      agency: string;
      account: string;
      pix: string;
    };

    if (!fullName || !cpf || !bank || !agency || !account || !pix) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    const bankDetails = await prisma.bankDetails.upsert({
      where: { userId: session.user.id },
      update: { fullName, cpf, bank, agency, account, pix },
      create: {
        userId: session.user.id,
        fullName,
        cpf,
        bank,
        agency,
        account,
        pix,
      },
    });

    return NextResponse.json({ success: true, bankDetails });
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar dados bancários" },
      { status: 500 }
    );
  }
}
