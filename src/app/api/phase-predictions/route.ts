import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const predictions = await prisma.phasePrediction.findMany({
    where: { userId: session.user.id },
    include: { team: true },
  });

  const championPred = await prisma.championPrediction.findUnique({
    where: { userId: session.user.id },
    include: { champion: true, runnerUp: true, thirdPlace: true },
  });

  return NextResponse.json({ phasePredictions: predictions, championPrediction: championPred });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phasePredictions, championPrediction } = body as {
      phasePredictions: { teamId: string; phase: string }[];
      championPrediction?: {
        championTeamId: string;
        runnerUpTeamId: string;
        thirdPlaceTeamId: string;
      };
    };

    // Check deadline
    const deadline = await prisma.settings.findUnique({
      where: { key: "GROUP_DEADLINE" },
    });

    if (deadline && new Date() > new Date(deadline.value)) {
      return NextResponse.json(
        { error: "O prazo para previsões de classificação já encerrou" },
        { status: 400 }
      );
    }

    // Save phase predictions
    if (phasePredictions && phasePredictions.length > 0) {
      // Delete existing predictions for these phases
      const phases = [...new Set(phasePredictions.map((p) => p.phase))];
      await prisma.phasePrediction.deleteMany({
        where: {
          userId: session.user.id,
          phase: { in: phases },
        },
      });

      // Create new predictions
      await prisma.phasePrediction.createMany({
        data: phasePredictions.map((p) => ({
          userId: session.user.id,
          teamId: p.teamId,
          phase: p.phase,
        })),
      });
    }

    // Save champion prediction
    if (championPrediction) {
      await prisma.championPrediction.upsert({
        where: { userId: session.user.id },
        update: {
          championTeamId: championPrediction.championTeamId,
          runnerUpTeamId: championPrediction.runnerUpTeamId,
          thirdPlaceTeamId: championPrediction.thirdPlaceTeamId,
        },
        create: {
          userId: session.user.id,
          championTeamId: championPrediction.championTeamId,
          runnerUpTeamId: championPrediction.runnerUpTeamId,
          thirdPlaceTeamId: championPrediction.thirdPlaceTeamId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar previsões" },
      { status: 500 }
    );
  }
}
