import { NextResponse } from "next/server";
import { isRegistrationClosed } from "@/lib/deadlines";

export const dynamic = "force-dynamic";

/** Public: whether new registrations are still allowed (betting deadline not yet passed). */
export async function GET() {
  return NextResponse.json({ closed: await isRegistrationClosed() });
}
