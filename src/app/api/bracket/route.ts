import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await prisma.settings.findUnique({
    where: { key: `BRACKET_${session.user.id}` },
  });

  return NextResponse.json({ bracketState: setting ? JSON.parse(setting.value) : {} });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if locked
  const deadlineSetting = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });
  if (deadlineSetting && new Date() > new Date(deadlineSetting.value)) {
    return NextResponse.json({ error: "Prazo encerrado" }, { status: 403 });
  }

  const { bracketState, phasePredictions, championPrediction } = await req.json();

  // Save bracket state as JSON blob in Settings table
  await prisma.settings.upsert({
    where: { key: `BRACKET_${session.user.id}` },
    create: { key: `BRACKET_${session.user.id}`, value: JSON.stringify(bracketState) },
    update: { value: JSON.stringify(bracketState) },
  });

  // Replace all phase predictions for this user
  await prisma.phasePrediction.deleteMany({ where: { userId: session.user.id } });

  if (phasePredictions && phasePredictions.length > 0) {
    await prisma.phasePrediction.createMany({
      data: phasePredictions.map((p: { teamId: string; phase: string }) => ({
        id: `${session.user.id}-${p.teamId}-${p.phase}`,
        userId: session.user.id,
        teamId: p.teamId,
        phase: p.phase,
      })),
    });
  }

  // Upsert champion prediction if complete
  if (championPrediction?.championTeamId && championPrediction?.runnerUpTeamId && championPrediction?.thirdPlaceTeamId) {
    await prisma.championPrediction.upsert({
      where: { userId: session.user.id },
      create: {
        id: `champ-${session.user.id}`,
        userId: session.user.id,
        championTeamId: championPrediction.championTeamId,
        runnerUpTeamId: championPrediction.runnerUpTeamId,
        thirdPlaceTeamId: championPrediction.thirdPlaceTeamId,
      },
      update: {
        championTeamId: championPrediction.championTeamId,
        runnerUpTeamId: championPrediction.runnerUpTeamId,
        thirdPlaceTeamId: championPrediction.thirdPlaceTeamId,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
