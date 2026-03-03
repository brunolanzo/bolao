import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcMatchPoints } from "@/lib/scoring";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { matchId, homeScore, awayScore, status } = (await request.json()) as {
      matchId: string;
      homeScore: number;
      awayScore: number;
      status: string;
    };

    // Update match result
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        status: status || "LIVE",
      },
    });

    // If match is finished, calculate points for all predictions
    if (status === "FINISHED") {
      const predictions = await prisma.matchPrediction.findMany({
        where: { matchId },
      });

      for (const pred of predictions) {
        const points = calcMatchPoints(
          pred.homeScore,
          pred.awayScore,
          homeScore,
          awayScore
        );

        await prisma.matchPrediction.update({
          where: { id: pred.id },
          data: { points },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar resultado" },
      { status: 500 }
    );
  }
}
