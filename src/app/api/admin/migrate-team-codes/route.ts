import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// One-time migration: update all team codes from English/international to PT-BR
// Safe to run multiple times — upserts are idempotent

const CODE_MAP: Record<string, string> = {
  // Already changed in seed but production DB may still have old codes
  KOR: "COR", // Coreia do Sul
  QAT: "CAT", // Catar
  SCO: "ESC", // Escócia
  GER: "ALE", // Alemanha
  CIV: "CMF", // Costa do Marfim
  ECU: "EQU", // Equador
  NED: "HOL", // Holanda
  EGY: "EGI", // Egito
  IRN: "IRA", // Irã
  NZL: "NZE", // Nova Zelândia
  KSA: "SAU", // Arábia Saudita
  ENG: "ING", // Inglaterra
  GHA: "GAN", // Gana
  // New corrections — remaining English codes
  RSA: "AFS", // África do Sul
  USA: "EUA", // Estados Unidos
  CUW: "CUR", // Curaçao
  JPN: "JAP", // Japão
};

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const results: { code: string; newCode: string; updated: boolean }[] = [];

  for (const [oldCode, newCode] of Object.entries(CODE_MAP)) {
    const team = await prisma.team.findUnique({ where: { code: oldCode } });
    if (team) {
      await prisma.team.update({
        where: { code: oldCode },
        data: { code: newCode },
      });
      results.push({ code: oldCode, newCode, updated: true });
    } else {
      results.push({ code: oldCode, newCode, updated: false });
    }
  }

  const updated = results.filter((r) => r.updated).length;
  const skipped = results.filter((r) => !r.updated).length;

  return NextResponse.json({
    message: `Migração concluída: ${updated} times atualizados, ${skipped} já estavam corretos ou não encontrados.`,
    results,
  });
}
