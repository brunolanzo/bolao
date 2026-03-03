import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PHASE_POINTS } from "@/lib/scoring";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { phase, qualifiedTeamIds } = (await request.json()) as {
      phase: string;
      qualifiedTeamIds: string[];
    };

    if (!phase || !qualifiedTeamIds || qualifiedTeamIds.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Calculate points for all users' phase predictions
    const allPredictions = await prisma.phasePrediction.findMany({
      where: { phase },
    });

    for (const pred of allPredictions) {
      const isCorrect = qualifiedTeamIds.includes(pred.teamId);
      const points = isCorrect ? (PHASE_POINTS[phase] || 0) : 0;

      await prisma.phasePrediction.update({
        where: { id: pred.id },
        data: { correct: isCorrect, points },
      });
    }

    // Update current phase setting
    await prisma.settings.upsert({
      where: { key: "CURRENT_PHASE" },
      update: { value: phase },
      create: { key: "CURRENT_PHASE", value: phase },
    });

    return NextResponse.json({ success: true, updated: allPredictions.length });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar fase" },
      { status: 500 }
    );
  }
}

// Set teams for a knockout match
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { matchId, homeTeamId, awayTeamId } = (await request.json()) as {
      matchId: string;
      homeTeamId: string;
      awayTeamId: string;
    };

    await prisma.match.update({
      where: { id: matchId },
      data: { homeTeamId, awayTeamId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao definir confronto" },
      { status: 500 }
    );
  }
}
