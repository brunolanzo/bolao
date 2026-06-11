import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRegistrationClosed } from "@/lib/deadlines";

export async function POST(request: Request) {
  try {
    // Registration closes once the betting deadline passes.
    if (await isRegistrationClosed()) {
      return NextResponse.json(
        { error: "As inscrições foram encerradas. O Bolão já começou!" },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Normalize email to lowercase so new registrations are always consistent.
    // Existing users with mixed-case emails are unaffected (login handles them via LOWER()).
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE LOWER(email) = ${normalizedEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "Usuário criado com sucesso", userId: user.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
