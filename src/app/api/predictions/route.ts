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

    // Fetch all matches for the predictions to know their phases
    const matchIds = predictions.map((p) => p.matchId);
    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true, phase: true, matchDate: true },
    });

    const matchById = new Map(matches.map((m) => [m.id, m]));

    // Compute deadline for each phase based on the first match of that phase
    const phases = [...new Set(matches.map((m) => m.phase))];
    const phaseDeadlines: Record<string, Date> = {};

    // GROUP uses GROUP_DEADLINE setting
    if (phases.includes("GROUP")) {
      const groupSetting = await prisma.settings.findUnique({
        where: { key: "GROUP_DEADLINE" },
      });
      if (groupSetting) {
        phaseDeadlines["GROUP"] = new Date(groupSetting.value);
      }
    }

    // Knockout phases use the matchDate of the first match of that phase
    const knockoutPhases = phases.filter((p) => p !== "GROUP");
    if (knockoutPhases.length > 0) {
      const phaseFirstMatches = await prisma.match.findMany({
        where: { phase: { in: knockoutPhases } },
        orderBy: { matchDate: "asc" },
      });
      for (const phase of knockoutPhases) {
        const firstMatch = phaseFirstMatches.find((m) => m.phase === phase);
        if (firstMatch) {
          phaseDeadlines[phase] = new Date(firstMatch.matchDate);
        }
      }
    }

    const now = new Date();

    // Validate each prediction against its phase deadline
    for (const pred of predictions) {
      const match = matchById.get(pred.matchId);
      if (!match) continue;
      const deadline = phaseDeadlines[match.phase];
      if (deadline && now > deadline) {
        const phaseLabel: Record<string, string> = {
          GROUP: "fase de grupos",
          ROUND_32: "Segunda Fase",
          ROUND_16: "Oitavas de Final",
          QUARTERS: "Quartas de Final",
          SEMIS: "Semifinais",
          THIRD_PLACE: "disputa de 3º lugar",
          FINAL: "Final",
        };
        return NextResponse.json(
          {
            error: `O prazo para palpites de ${phaseLabel[match.phase] || match.phase} já encerrou`,
          },
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
