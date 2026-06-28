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

    // Fetch all matches for the predictions to know their phase / kickoff / status
    const matchIds = predictions.map((p) => p.matchId);
    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true, phase: true, matchDate: true, status: true },
    });

    const matchById = new Map(matches.map((m) => [m.id, m]));

    // GROUP keeps a single shared deadline (the GROUP_DEADLINE setting).
    // Knockout matches lock individually at their own kickoff — see below.
    let groupDeadline: Date | null = null;
    if (matches.some((m) => m.phase === "GROUP")) {
      const groupSetting = await prisma.settings.findUnique({
        where: { key: "GROUP_DEADLINE" },
      });
      if (groupSetting) groupDeadline = new Date(groupSetting.value);
    }

    const now = new Date();

    // Validate each prediction against the right deadline.
    for (const pred of predictions) {
      const match = matchById.get(pred.matchId);
      if (!match) continue;

      let locked = false;
      if (match.phase === "GROUP") {
        // Whole group phase closes at GROUP_DEADLINE.
        locked = groupDeadline ? now > groupDeadline : false;
      } else {
        // Each knockout match closes at its own kickoff (or once it's already
        // live/finished — covers a real kickoff earlier than the stored time).
        locked =
          match.status === "LIVE" ||
          match.status === "FINISHED" ||
          now > new Date(match.matchDate);
      }

      if (locked) {
        const phaseLabel: Record<string, string> = {
          GROUP: "fase de grupos",
          ROUND_32: "Segunda Fase",
          ROUND_16: "Oitavas de Final",
          QUARTERS: "Quartas de Final",
          SEMIS: "Semifinais",
          THIRD_PLACE: "disputa de 3º lugar",
          FINAL: "Final",
        };
        const msg =
          match.phase === "GROUP"
            ? "O prazo para palpites da fase de grupos já encerrou"
            : `O prazo para palpitar este jogo (${phaseLabel[match.phase] || match.phase}) já encerrou — a partida já começou`;
        return NextResponse.json({ error: msg }, { status: 400 });
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
