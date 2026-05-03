import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Don't track admin visits
    const session = await getServerSession(authOptions);
    if (session?.user?.role === "admin") {
      return NextResponse.json({ ok: true });
    }

    const { path } = await req.json();
    if (!path || typeof path !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Skip internal Next.js paths
    if (path.startsWith("/_next") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }

    await prisma.pageView.create({ data: { path } });
    return NextResponse.json({ ok: true });
  } catch {
    // Fail silently — tracking should never break the app
    return NextResponse.json({ ok: false });
  }
}
