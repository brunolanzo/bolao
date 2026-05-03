import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/migrate-pageview
 *
 * Creates the PageView table and indexes if they don't already exist.
 * Safe to run multiple times (idempotent).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PageView" (
        id        TEXT PRIMARY KEY,
        path      TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PageView_path_idx" ON "PageView"("path")
    `);

    // Verify by counting rows
    const result = await prisma.$queryRaw<[{ n: number }]>`
      SELECT COUNT(*) as n FROM "PageView"
    `;
    const count = Number(result[0]?.n ?? 0);

    return NextResponse.json({
      ok: true,
      message: `Tabela PageView pronta. ${count} registro(s) existente(s).`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
