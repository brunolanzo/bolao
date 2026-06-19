import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/db — tries to load Prisma + the SQLite native binding and run
 * a trivial query, capturing any thrown error as text. Combined with
 * /api/health this isolates the 503 cause:
 *   - /api/health 200 + /api/health/db 200  → app is healthy
 *   - /api/health 200 + /api/health/db 500  → DB/native-binary issue (error shown)
 *   - /api/health 503                        → environmental (OOM/supervisor)
 * Prisma is imported dynamically so a native-load failure is caught here
 * instead of crashing module evaluation.
 */
export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const userCount = await prisma.user.count();
    return NextResponse.json({ ok: true, userCount });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      { ok: false, name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6) },
      { status: 500 },
    );
  }
}
