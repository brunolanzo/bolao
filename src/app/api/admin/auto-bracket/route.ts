import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePhases } from "@/lib/resolvePhases";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

// Copa 2026 R32 bracket structure (matches IDs in DB are matchOrder-based;
// we match by phase=ROUND_32 ordered by matchOrder, slots in canonical order
// of FIFA's published bracket).
type SlotSpec =
  | { kind: "1st"; group: string }
  | { kind: "2nd"; group: string }
  | { kind: "3rd"; eligible: string[] };

const R32_SLOTS: { home: SlotSpec; away: SlotSpec }[] = [
  // Order corresponds to matchOrder of ROUND_32 matches in DB (1..16)
  { home: { kind: "2nd", group: "A" }, away: { kind: "2nd", group: "B" } },                            // M73
  { home: { kind: "1st", group: "E" }, away: { kind: "3rd", eligible: ["A","B","C","D","F"] } },        // M74
  { home: { kind: "1st", group: "F" }, away: { kind: "2nd", group: "C" } },                            // M75
  { home: { kind: "1st", group: "C" }, away: { kind: "2nd", group: "F" } },                            // M76
  { home: { kind: "1st", group: "I" }, away: { kind: "3rd", eligible: ["C","D","F","G","H"] } },        // M77
  { home: { kind: "2nd", group: "E" }, away: { kind: "2nd", group: "I" } },                            // M78
  { home: { kind: "1st", group: "A" }, away: { kind: "3rd", eligible: ["C","E","F","H","I"] } },        // M79
  { home: { kind: "1st", group: "L" }, away: { kind: "3rd", eligible: ["E","H","I","J","K"] } },        // M80
  { home: { kind: "1st", group: "D" }, away: { kind: "3rd", eligible: ["B","E","F","I","J"] } },        // M81
  { home: { kind: "1st", group: "G" }, away: { kind: "3rd", eligible: ["A","E","H","I","J"] } },        // M82
  { home: { kind: "2nd", group: "K" }, away: { kind: "2nd", group: "L" } },                            // M83
  { home: { kind: "1st", group: "H" }, away: { kind: "2nd", group: "J" } },                            // M84
  { home: { kind: "1st", group: "B" }, away: { kind: "3rd", eligible: ["E","F","G","I","J"] } },        // M85
  { home: { kind: "1st", group: "J" }, away: { kind: "2nd", group: "H" } },                            // M86
  { home: { kind: "1st", group: "K" }, away: { kind: "3rd", eligible: ["D","E","I","J","L"] } },        // M87
  { home: { kind: "2nd", group: "D" }, away: { kind: "2nd", group: "G" } },                            // M88
];

interface Standing {
  teamId: string;
  group: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

function compareStanding(a: Standing, b: Standing) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    // Load all GROUP matches
    const groupMatches = await prisma.match.findMany({
      where: { phase: "GROUP" },
      orderBy: { matchOrder: "asc" },
    });

    // Compute standings per group from FINISHED matches with scores
    const teamGroup = new Map<string, string>();
    const allTeams = await prisma.team.findMany();
    for (const t of allTeams) teamGroup.set(t.id, t.groupLabel);

    const standingsByGroup: Record<string, Standing[]> = {};
    for (const g of GROUPS) standingsByGroup[g] = [];

    const stats = new Map<string, Standing>();
    for (const t of allTeams) {
      stats.set(t.id, {
        teamId: t.id, group: t.groupLabel,
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
      });
    }

    for (const m of groupMatches) {
      if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
      if (!m.homeTeamId || !m.awayTeamId) continue;
      const h = stats.get(m.homeTeamId);
      const a = stats.get(m.awayTeamId);
      if (!h || !a) continue;
      h.played++; a.played++;
      h.goalsFor += m.homeScore; h.goalsAgainst += m.awayScore;
      a.goalsFor += m.awayScore; a.goalsAgainst += m.homeScore;
      if (m.homeScore > m.awayScore) { h.wins++; h.points += 3; a.losses++; }
      else if (m.homeScore < m.awayScore) { a.wins++; a.points += 3; h.losses++; }
      else { h.draws++; h.points++; a.draws++; a.points++; }
    }
    for (const s of stats.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;

    for (const s of stats.values()) {
      if (standingsByGroup[s.group]) standingsByGroup[s.group].push(s);
    }
    for (const g of GROUPS) standingsByGroup[g].sort(compareStanding);

    // Sanity check: all groups need 3 teams played all 3 matches (3 games per team)
    const incomplete: string[] = [];
    for (const g of GROUPS) {
      const ok = standingsByGroup[g].every((s) => s.played === 3);
      if (!ok) incomplete.push(g);
    }
    if (incomplete.length > 0) {
      return NextResponse.json(
        { error: `Resultados incompletos nos grupos: ${incomplete.join(", ")}` },
        { status: 400 },
      );
    }

    // Best 8 thirds across all 12 groups
    const allThirds: Standing[] = [];
    for (const g of GROUPS) {
      const s = standingsByGroup[g][2];
      if (s) allThirds.push(s);
    }
    allThirds.sort(compareStanding);
    const qualifyingThirds = allThirds.slice(0, 8);
    const qualifyingThirdsByGroup = new Map<string, Standing>();
    for (const t of qualifyingThirds) qualifyingThirdsByGroup.set(t.group, t);

    // Resolve slots
    function resolve1st(g: string): string | null {
      return standingsByGroup[g][0]?.teamId ?? null;
    }
    function resolve2nd(g: string): string | null {
      return standingsByGroup[g][1]?.teamId ?? null;
    }

    // Greedy assignment of 3rd-place teams to slots:
    // For each 3rd-place slot (in order), pick the highest-ranked
    // qualifying third whose group is in the slot's eligible list.
    const thirdSlotIdxs: number[] = [];
    R32_SLOTS.forEach((s, i) => {
      if (s.home.kind === "3rd" || s.away.kind === "3rd") thirdSlotIdxs.push(i);
    });

    const remainingThirds = [...qualifyingThirds]; // sorted best first
    const slotAssignments: Record<number, string> = {}; // slotIdx → teamId

    for (const slotIdx of thirdSlotIdxs) {
      const spec = R32_SLOTS[slotIdx];
      const thirdSpec = (spec.home.kind === "3rd" ? spec.home : spec.away) as { kind: "3rd"; eligible: string[] };
      const idx = remainingThirds.findIndex((t) => thirdSpec.eligible.includes(t.group));
      if (idx >= 0) {
        slotAssignments[slotIdx] = remainingThirds[idx].teamId;
        remainingThirds.splice(idx, 1);
      }
    }

    // Load R32 matches in order
    const r32Matches = await prisma.match.findMany({
      where: { phase: "ROUND_32" },
      orderBy: { matchOrder: "asc" },
    });

    if (r32Matches.length !== 16) {
      return NextResponse.json(
        { error: `Esperava 16 jogos na ROUND_32, encontrou ${r32Matches.length}` },
        { status: 500 },
      );
    }

    // Update each match
    let updated = 0;
    for (let i = 0; i < R32_SLOTS.length; i++) {
      const slot = R32_SLOTS[i];
      const match = r32Matches[i];

      let homeTeamId: string | null = null;
      let awayTeamId: string | null = null;

      if (slot.home.kind === "1st") homeTeamId = resolve1st(slot.home.group);
      else if (slot.home.kind === "2nd") homeTeamId = resolve2nd(slot.home.group);
      else homeTeamId = slotAssignments[i] ?? null;

      if (slot.away.kind === "1st") awayTeamId = resolve1st(slot.away.group);
      else if (slot.away.kind === "2nd") awayTeamId = resolve2nd(slot.away.group);
      else awayTeamId = slotAssignments[i] ?? null;

      if (homeTeamId && awayTeamId) {
        await prisma.match.update({
          where: { id: match.id },
          data: { homeTeamId, awayTeamId },
        });
        updated++;
      }
    }

    // Now that ROUND_32 teams are set, resolve PhasePredictions for ROUND_32
    // (and any later phases that may already have FINISHED matches).
    await resolvePhases();

    return NextResponse.json({ success: true, updated, qualifyingThirds: qualifyingThirds.map((t) => t.teamId) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao formar Segunda Fase" },
      { status: 500 },
    );
  }
}
