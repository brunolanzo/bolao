import { prisma } from "@/lib/prisma";

/**
 * Reads the GROUP_DEADLINE setting (the betting close time) as a Date.
 * The stored value carries its own UTC offset (e.g. "...-03:00" for Brasília),
 * so `new Date()` parses it to the correct absolute instant.
 */
export async function getGroupDeadline(): Promise<Date | null> {
  const s = await prisma.settings.findUnique({ where: { key: "GROUP_DEADLINE" } });
  if (!s?.value) return null;
  const d = new Date(s.value);
  return isNaN(d.getTime()) ? null : d;
}

/** True once the betting close time (GROUP_DEADLINE) has passed → registration is closed. */
export async function isRegistrationClosed(now: Date = new Date()): Promise<boolean> {
  const deadline = await getGroupDeadline();
  return deadline ? now > deadline : false;
}

/** Kickoff of the earliest match of the tournament, or null if no matches exist. */
export async function getFirstMatchKickoff(): Promise<Date | null> {
  const m = await prisma.match.findFirst({
    orderBy: { matchDate: "asc" },
    select: { matchDate: true },
  });
  return m ? new Date(m.matchDate) : null;
}

/** True once the first match has kicked off. */
export async function hasFirstMatchStarted(now: Date = new Date()): Promise<boolean> {
  const kickoff = await getFirstMatchKickoff();
  return kickoff ? now >= kickoff : false;
}
