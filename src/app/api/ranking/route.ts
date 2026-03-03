import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: "user" },
    include: {
      matchPredictions: {
        where: { points: { not: null } },
      },
      phasePredictions: {
        where: { points: { not: null } },
      },
      championPrediction: true,
    },
    orderBy: { name: "asc" },
  });

  const ranking = users
    .map((user) => {
      const matchPoints = user.matchPredictions.reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      const phasePoints = user.phasePredictions.reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      const champPoints =
        (user.championPrediction?.championPoints || 0) +
        (user.championPrediction?.runnerUpPoints || 0) +
        (user.championPrediction?.thirdPlacePoints || 0);

      return {
        id: user.id,
        name: user.name,
        matchPoints,
        phasePoints,
        champPoints,
        totalPoints: matchPoints + phasePoints + champPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return NextResponse.json(ranking);
}
