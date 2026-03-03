import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CHAMPION_POINTS,
  RUNNER_UP_POINTS,
  THIRD_PLACE_POINTS,
} from "@/lib/scoring";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const settings = await prisma.settings.findMany();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ settings, users });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { action, data } = (await request.json()) as {
      action: string;
      data: Record<string, string>;
    };

    if (action === "updateSettings") {
      for (const [key, value] of Object.entries(data)) {
        await prisma.settings.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "promoteAdmin") {
      await prisma.user.update({
        where: { id: data.userId },
        data: { role: "admin" },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "calculateChampionPoints") {
      const { championId, runnerUpId, thirdPlaceId } = data;

      // Update all champion predictions
      const predictions = await prisma.championPrediction.findMany();

      for (const pred of predictions) {
        const champPts = pred.championTeamId === championId ? CHAMPION_POINTS : 0;
        const runnerPts = pred.runnerUpTeamId === runnerUpId ? RUNNER_UP_POINTS : 0;
        const thirdPts = pred.thirdPlaceTeamId === thirdPlaceId ? THIRD_PLACE_POINTS : 0;

        await prisma.championPrediction.update({
          where: { id: pred.id },
          data: {
            championPoints: champPts,
            runnerUpPoints: runnerPts,
            thirdPlacePoints: thirdPts,
          },
        });
      }

      return NextResponse.json({ success: true, updated: predictions.length });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao processar ação" },
      { status: 500 }
    );
  }
}
