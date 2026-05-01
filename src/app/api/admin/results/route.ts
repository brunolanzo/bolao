import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcMatchPoints } from "@/lib/scoring";
import { resolvePhases } from "@/lib/resolvePhases";

interface ResultUpdate {
  matchId: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updates: ResultUpdate[] = body.updates
      ? body.updates
      : [body as ResultUpdate];

    let count = 0;
    for (const u of updates) {
      if (
        !u.matchId ||
        typeof u.homeScore !== "number" ||
        typeof u.awayScore !== "number"
      ) {
        continue;
      }

      await prisma.match.update({
        where: { id: u.matchId },
        data: {
          homeScore: u.homeScore,
          awayScore: u.awayScore,
          status: u.status || "LIVE",
        },
      });

      // Calculate points for predictions if FINISHED
      if (u.status === "FINISHED") {
        const predictions = await prisma.matchPrediction.findMany({
          where: { matchId: u.matchId },
        });
        for (const pred of predictions) {
          const points = calcMatchPoints(
            pred.homeScore,
            pred.awayScore,
            u.homeScore,
            u.awayScore,
          );
          await prisma.matchPrediction.update({
            where: { id: pred.id },
            data: { points },
          });
        }
      }
      count++;
    }

    // After applying results, recompute qualifiers and resolve all
    // PhasePredictions / ChampionPredictions for affected phases.
    await resolvePhases();

    return NextResponse.json({ success: true, count });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar resultados" },
      { status: 500 },
    );
  }
}
