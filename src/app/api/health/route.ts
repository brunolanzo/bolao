import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — pure liveness check. Imports NOTHING heavy (no Prisma,
 * no native modules). If this returns 200, the Node server itself boots fine
 * and the problem is isolated to something a specific route loads (e.g. the
 * SQLite native binary). If this ALSO 503s, the crash is environmental
 * (out-of-memory, supervisor, port) and not our application code.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    node: process.version,
    rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
}
