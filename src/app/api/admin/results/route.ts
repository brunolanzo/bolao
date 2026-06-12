import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcMatchPoints } from "@/lib/scoring";
import { resolvePhases } from "@/lib/resolvePhases";
import { saveRankingSnapshot } from "@/lib/ranking";

interface LastScoreInfo {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

interface ResultUpdate {
  matchId: string;
  homeScore: number;
  awayScore: number;
  status: string;
  homePenalties?: number | null;
  awayPenalties?: number | null;
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
    let anyFinished = false;
    let lastScore: LastScoreInfo | null = null;

    for (const u of updates) {
      if (
        !u.matchId ||
        typeof u.homeScore !== "number" ||
        typeof u.awayScore !== "number"
      ) {
        continue;
      }

      const match = await prisma.match.findUnique({
        where: { id: u.matchId },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      });
      if (!match) continue;

      const newStatus = u.status || "LIVE";

      await prisma.match.update({
        where: { id: u.matchId },
        data: {
          homeScore: u.homeScore,
          awayScore: u.awayScore,
          status: newStatus,
          homePenalties: u.homePenalties ?? null,
          awayPenalties: u.awayPenalties ?? null,
        },
      });

      // Score predictions live: points count as soon as a match is LIVE or
      // FINISHED, so the ranking reflects the current scoreline mid-game.
      // Resetting a match to SCHEDULED clears its points.
      if (newStatus === "FINISHED" || newStatus === "LIVE") {
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
      } else {
        await prisma.matchPrediction.updateMany({
          where: { matchId: u.matchId },
          data: { points: null },
        });
      }

      if (newStatus === "FINISHED") anyFinished = true;

      // Remember the last scoreline entered → drives the "TEM GOL!" header.
      lastScore = {
        homeName: match.homeTeam?.name ?? "Mandante",
        awayName: match.awayTeam?.name ?? "Visitante",
        homeScore: u.homeScore,
        awayScore: u.awayScore,
        status: newStatus,
      };

      count++;
    }

    // After applying results, recompute qualifiers and resolve all
    // PhasePredictions / ChampionPredictions for affected phases.
    await resolvePhases();

    // Persist the last scoreline for the ranking's WhatsApp header.
    if (lastScore) {
      await prisma.settings.upsert({
        where: { key: "LAST_SCORE" },
        create: { key: "LAST_SCORE", value: JSON.stringify(lastScore) },
        update: { value: JSON.stringify(lastScore) },
      });
    }

    // When any match is finalized, snapshot the ranking as the new baseline
    // ("ranking ao final do último jogo finalizado") for the movement arrows.
    if (anyFinished) {
      await saveRankingSnapshot();
    }

    return NextResponse.json({ success: true, count });
  } catch {
    return NextResponse.json(
      { error: "Erro ao atualizar resultados" },
      { status: 500 },
    );
  }
}
