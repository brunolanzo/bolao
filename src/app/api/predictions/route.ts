import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (phase) {
    where.match = { phase };
  }

  const predictions = await prisma.matchPrediction.findMany({
    where,
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
  });

  return NextResponse.json(predictions);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { predictions } = body as {
      predictions: { matchId: string; homeScore: number; awayScore: number }[];
    };

    if (!predictions || !Array.isArray(predictions)) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Check deadline
    const deadline = await prisma.settings.findUnique({
      where: { key: "GROUP_DEADLINE" },
    });

    if (deadline && new Date() > new Date(deadline.value)) {
      // Check if this is group stage - verify first match
      const firstMatch = await prisma.match.findFirst({
        where: { id: { in: predictions.map((p) => p.matchId) } },
      });
      if (firstMatch?.phase === "GROUP") {
        return NextResponse.json(
          { error: "O prazo para palpites da fase de grupos já encerrou" },
          { status: 400 }
        );
      }
    }

    // Upsert all predictions
    const results = await Promise.all(
      predictions.map((pred) =>
        prisma.matchPrediction.upsert({
          where: {
            userId_matchId: {
              userId: session.user.id,
              matchId: pred.matchId,
            },
          },
          update: {
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
          },
          create: {
            userId: session.user.id,
            matchId: pred.matchId,
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
          },
        })
      )
    );

    return NextResponse.json({ saved: results.length });
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar palpites" },
      { status: 500 }
    );
  }
}
