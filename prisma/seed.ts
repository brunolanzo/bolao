import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

const teams = [
  // Group A
  { name: "México", code: "MEX", groupLabel: "A" },
  { name: "África do Sul", code: "RSA", groupLabel: "A" },
  { name: "Coreia do Sul", code: "KOR", groupLabel: "A" },
  { name: "Vencedor UEFA D", code: "UD", groupLabel: "A" },
  // Group B
  { name: "Canadá", code: "CAN", groupLabel: "B" },
  { name: "Suíça", code: "SUI", groupLabel: "B" },
  { name: "Catar", code: "QAT", groupLabel: "B" },
  { name: "Vencedor UEFA A", code: "UA", groupLabel: "B" },
  // Group C
  { name: "Brasil", code: "BRA", groupLabel: "C" },
  { name: "Marrocos", code: "MAR", groupLabel: "C" },
  { name: "Haiti", code: "HAI", groupLabel: "C" },
  { name: "Escócia", code: "SCO", groupLabel: "C" },
  // Group D
  { name: "Estados Unidos", code: "USA", groupLabel: "D" },
  { name: "Paraguai", code: "PAR", groupLabel: "D" },
  { name: "Austrália", code: "AUS", groupLabel: "D" },
  { name: "Vencedor UEFA C", code: "UC", groupLabel: "D" },
  // Group E
  { name: "Alemanha", code: "GER", groupLabel: "E" },
  { name: "Curaçao", code: "CUW", groupLabel: "E" },
  { name: "Costa do Marfim", code: "CIV", groupLabel: "E" },
  { name: "Equador", code: "ECU", groupLabel: "E" },
  // Group F
  { name: "Holanda", code: "NED", groupLabel: "F" },
  { name: "Japão", code: "JPN", groupLabel: "F" },
  { name: "Tunísia", code: "TUN", groupLabel: "F" },
  { name: "Vencedor UEFA B", code: "UB", groupLabel: "F" },
  // Group G
  { name: "Bélgica", code: "BEL", groupLabel: "G" },
  { name: "Egito", code: "EGY", groupLabel: "G" },
  { name: "Irã", code: "IRN", groupLabel: "G" },
  { name: "Nova Zelândia", code: "NZL", groupLabel: "G" },
  // Group H
  { name: "Espanha", code: "ESP", groupLabel: "H" },
  { name: "Cabo Verde", code: "CPV", groupLabel: "H" },
  { name: "Arábia Saudita", code: "KSA", groupLabel: "H" },
  { name: "Uruguai", code: "URU", groupLabel: "H" },
  // Group I
  { name: "França", code: "FRA", groupLabel: "I" },
  { name: "Senegal", code: "SEN", groupLabel: "I" },
  { name: "Noruega", code: "NOR", groupLabel: "I" },
  { name: "Vencedor IC 2", code: "IC2", groupLabel: "I" },
  // Group J
  { name: "Argentina", code: "ARG", groupLabel: "J" },
  { name: "Argélia", code: "ALG", groupLabel: "J" },
  { name: "Áustria", code: "AUT", groupLabel: "J" },
  { name: "Jordânia", code: "JOR", groupLabel: "J" },
  // Group K
  { name: "Portugal", code: "POR", groupLabel: "K" },
  { name: "Uzbequistão", code: "UZB", groupLabel: "K" },
  { name: "Colômbia", code: "COL", groupLabel: "K" },
  { name: "Vencedor IC 1", code: "IC1", groupLabel: "K" },
  // Group L
  { name: "Inglaterra", code: "ENG", groupLabel: "L" },
  { name: "Croácia", code: "CRO", groupLabel: "L" },
  { name: "Gana", code: "GHA", groupLabel: "L" },
  { name: "Panamá", code: "PAN", groupLabel: "L" },
];

interface MatchData {
  matchOrder: number;
  phase: string;
  groupLabel: string;
  homeCode: string;
  awayCode: string;
  date: string; // YYYY-MM-DD
}

const groupMatches: MatchData[] = [
  // Group A - Jun 11, 18, 24
  { matchOrder: 1, phase: "GROUP", groupLabel: "A", homeCode: "MEX", awayCode: "RSA", date: "2026-06-11" },
  { matchOrder: 2, phase: "GROUP", groupLabel: "A", homeCode: "KOR", awayCode: "UD", date: "2026-06-11" },
  { matchOrder: 25, phase: "GROUP", groupLabel: "A", homeCode: "UD", awayCode: "RSA", date: "2026-06-18" },
  { matchOrder: 28, phase: "GROUP", groupLabel: "A", homeCode: "MEX", awayCode: "KOR", date: "2026-06-18" },
  { matchOrder: 53, phase: "GROUP", groupLabel: "A", homeCode: "UD", awayCode: "MEX", date: "2026-06-24" },
  { matchOrder: 54, phase: "GROUP", groupLabel: "A", homeCode: "RSA", awayCode: "KOR", date: "2026-06-24" },
  // Group B - Jun 12-13, 18, 24
  { matchOrder: 3, phase: "GROUP", groupLabel: "B", homeCode: "CAN", awayCode: "UA", date: "2026-06-12" },
  { matchOrder: 8, phase: "GROUP", groupLabel: "B", homeCode: "QAT", awayCode: "SUI", date: "2026-06-13" },
  { matchOrder: 26, phase: "GROUP", groupLabel: "B", homeCode: "SUI", awayCode: "UA", date: "2026-06-18" },
  { matchOrder: 27, phase: "GROUP", groupLabel: "B", homeCode: "CAN", awayCode: "QAT", date: "2026-06-18" },
  { matchOrder: 51, phase: "GROUP", groupLabel: "B", homeCode: "SUI", awayCode: "CAN", date: "2026-06-24" },
  { matchOrder: 52, phase: "GROUP", groupLabel: "B", homeCode: "UA", awayCode: "QAT", date: "2026-06-24" },
  // Group C - Jun 13, 19, 24
  { matchOrder: 5, phase: "GROUP", groupLabel: "C", homeCode: "HAI", awayCode: "SCO", date: "2026-06-13" },
  { matchOrder: 7, phase: "GROUP", groupLabel: "C", homeCode: "BRA", awayCode: "MAR", date: "2026-06-13" },
  { matchOrder: 29, phase: "GROUP", groupLabel: "C", homeCode: "BRA", awayCode: "HAI", date: "2026-06-19" },
  { matchOrder: 30, phase: "GROUP", groupLabel: "C", homeCode: "SCO", awayCode: "MAR", date: "2026-06-19" },
  { matchOrder: 49, phase: "GROUP", groupLabel: "C", homeCode: "SCO", awayCode: "BRA", date: "2026-06-24" },
  { matchOrder: 50, phase: "GROUP", groupLabel: "C", homeCode: "MAR", awayCode: "HAI", date: "2026-06-24" },
  // Group D - Jun 12-13, 19, 25
  { matchOrder: 4, phase: "GROUP", groupLabel: "D", homeCode: "USA", awayCode: "PAR", date: "2026-06-12" },
  { matchOrder: 6, phase: "GROUP", groupLabel: "D", homeCode: "AUS", awayCode: "UC", date: "2026-06-13" },
  { matchOrder: 31, phase: "GROUP", groupLabel: "D", homeCode: "UC", awayCode: "PAR", date: "2026-06-19" },
  { matchOrder: 32, phase: "GROUP", groupLabel: "D", homeCode: "USA", awayCode: "AUS", date: "2026-06-19" },
  { matchOrder: 59, phase: "GROUP", groupLabel: "D", homeCode: "UC", awayCode: "USA", date: "2026-06-25" },
  { matchOrder: 60, phase: "GROUP", groupLabel: "D", homeCode: "PAR", awayCode: "AUS", date: "2026-06-25" },
  // Group E - Jun 14, 20, 25
  { matchOrder: 9, phase: "GROUP", groupLabel: "E", homeCode: "CIV", awayCode: "ECU", date: "2026-06-14" },
  { matchOrder: 10, phase: "GROUP", groupLabel: "E", homeCode: "GER", awayCode: "CUW", date: "2026-06-14" },
  { matchOrder: 33, phase: "GROUP", groupLabel: "E", homeCode: "GER", awayCode: "CIV", date: "2026-06-20" },
  { matchOrder: 34, phase: "GROUP", groupLabel: "E", homeCode: "ECU", awayCode: "CUW", date: "2026-06-20" },
  { matchOrder: 55, phase: "GROUP", groupLabel: "E", homeCode: "CUW", awayCode: "CIV", date: "2026-06-25" },
  { matchOrder: 56, phase: "GROUP", groupLabel: "E", homeCode: "ECU", awayCode: "GER", date: "2026-06-25" },
  // Group F - Jun 14, 20, 25
  { matchOrder: 11, phase: "GROUP", groupLabel: "F", homeCode: "NED", awayCode: "JPN", date: "2026-06-14" },
  { matchOrder: 12, phase: "GROUP", groupLabel: "F", homeCode: "UB", awayCode: "TUN", date: "2026-06-14" },
  { matchOrder: 35, phase: "GROUP", groupLabel: "F", homeCode: "NED", awayCode: "UB", date: "2026-06-20" },
  { matchOrder: 36, phase: "GROUP", groupLabel: "F", homeCode: "TUN", awayCode: "JPN", date: "2026-06-20" },
  { matchOrder: 57, phase: "GROUP", groupLabel: "F", homeCode: "JPN", awayCode: "UB", date: "2026-06-25" },
  { matchOrder: 58, phase: "GROUP", groupLabel: "F", homeCode: "TUN", awayCode: "NED", date: "2026-06-25" },
  // Group G - Jun 15, 21, 26
  { matchOrder: 15, phase: "GROUP", groupLabel: "G", homeCode: "IRN", awayCode: "NZL", date: "2026-06-15" },
  { matchOrder: 16, phase: "GROUP", groupLabel: "G", homeCode: "BEL", awayCode: "EGY", date: "2026-06-15" },
  { matchOrder: 39, phase: "GROUP", groupLabel: "G", homeCode: "BEL", awayCode: "IRN", date: "2026-06-21" },
  { matchOrder: 40, phase: "GROUP", groupLabel: "G", homeCode: "NZL", awayCode: "EGY", date: "2026-06-21" },
  { matchOrder: 63, phase: "GROUP", groupLabel: "G", homeCode: "EGY", awayCode: "IRN", date: "2026-06-26" },
  { matchOrder: 64, phase: "GROUP", groupLabel: "G", homeCode: "NZL", awayCode: "BEL", date: "2026-06-26" },
  // Group H - Jun 15, 21, 26
  { matchOrder: 13, phase: "GROUP", groupLabel: "H", homeCode: "KSA", awayCode: "URU", date: "2026-06-15" },
  { matchOrder: 14, phase: "GROUP", groupLabel: "H", homeCode: "ESP", awayCode: "CPV", date: "2026-06-15" },
  { matchOrder: 37, phase: "GROUP", groupLabel: "H", homeCode: "URU", awayCode: "CPV", date: "2026-06-21" },
  { matchOrder: 38, phase: "GROUP", groupLabel: "H", homeCode: "ESP", awayCode: "KSA", date: "2026-06-21" },
  { matchOrder: 65, phase: "GROUP", groupLabel: "H", homeCode: "CPV", awayCode: "KSA", date: "2026-06-26" },
  { matchOrder: 66, phase: "GROUP", groupLabel: "H", homeCode: "URU", awayCode: "ESP", date: "2026-06-26" },
  // Group I - Jun 16, 22, 26
  { matchOrder: 17, phase: "GROUP", groupLabel: "I", homeCode: "FRA", awayCode: "SEN", date: "2026-06-16" },
  { matchOrder: 18, phase: "GROUP", groupLabel: "I", homeCode: "IC2", awayCode: "NOR", date: "2026-06-16" },
  { matchOrder: 41, phase: "GROUP", groupLabel: "I", homeCode: "NOR", awayCode: "SEN", date: "2026-06-22" },
  { matchOrder: 42, phase: "GROUP", groupLabel: "I", homeCode: "FRA", awayCode: "IC2", date: "2026-06-22" },
  { matchOrder: 61, phase: "GROUP", groupLabel: "I", homeCode: "NOR", awayCode: "FRA", date: "2026-06-26" },
  { matchOrder: 62, phase: "GROUP", groupLabel: "I", homeCode: "SEN", awayCode: "IC2", date: "2026-06-26" },
  // Group J - Jun 16, 22, 27
  { matchOrder: 19, phase: "GROUP", groupLabel: "J", homeCode: "ARG", awayCode: "ALG", date: "2026-06-16" },
  { matchOrder: 20, phase: "GROUP", groupLabel: "J", homeCode: "AUT", awayCode: "JOR", date: "2026-06-16" },
  { matchOrder: 43, phase: "GROUP", groupLabel: "J", homeCode: "ARG", awayCode: "AUT", date: "2026-06-22" },
  { matchOrder: 44, phase: "GROUP", groupLabel: "J", homeCode: "JOR", awayCode: "ALG", date: "2026-06-22" },
  { matchOrder: 69, phase: "GROUP", groupLabel: "J", homeCode: "ALG", awayCode: "AUT", date: "2026-06-27" },
  { matchOrder: 70, phase: "GROUP", groupLabel: "J", homeCode: "JOR", awayCode: "ARG", date: "2026-06-27" },
  // Group K - Jun 17, 23, 27
  { matchOrder: 23, phase: "GROUP", groupLabel: "K", homeCode: "POR", awayCode: "IC1", date: "2026-06-17" },
  { matchOrder: 24, phase: "GROUP", groupLabel: "K", homeCode: "UZB", awayCode: "COL", date: "2026-06-17" },
  { matchOrder: 47, phase: "GROUP", groupLabel: "K", homeCode: "POR", awayCode: "UZB", date: "2026-06-23" },
  { matchOrder: 48, phase: "GROUP", groupLabel: "K", homeCode: "COL", awayCode: "IC1", date: "2026-06-23" },
  { matchOrder: 71, phase: "GROUP", groupLabel: "K", homeCode: "COL", awayCode: "POR", date: "2026-06-27" },
  { matchOrder: 72, phase: "GROUP", groupLabel: "K", homeCode: "IC1", awayCode: "UZB", date: "2026-06-27" },
  // Group L - Jun 17, 23, 27
  { matchOrder: 21, phase: "GROUP", groupLabel: "L", homeCode: "GHA", awayCode: "PAN", date: "2026-06-17" },
  { matchOrder: 22, phase: "GROUP", groupLabel: "L", homeCode: "ENG", awayCode: "CRO", date: "2026-06-17" },
  { matchOrder: 45, phase: "GROUP", groupLabel: "L", homeCode: "ENG", awayCode: "GHA", date: "2026-06-23" },
  { matchOrder: 46, phase: "GROUP", groupLabel: "L", homeCode: "PAN", awayCode: "CRO", date: "2026-06-23" },
  { matchOrder: 67, phase: "GROUP", groupLabel: "L", homeCode: "PAN", awayCode: "ENG", date: "2026-06-27" },
  { matchOrder: 68, phase: "GROUP", groupLabel: "L", homeCode: "CRO", awayCode: "GHA", date: "2026-06-27" },
];

// Knockout round placeholder matches (teams TBD)
const knockoutMatches = [
  // Round of 32 - 16 matches (Jun 28 - Jul 2)
  ...Array.from({ length: 16 }, (_, i) => ({
    matchOrder: 73 + i,
    phase: "ROUND_32",
    date: i < 4 ? "2026-06-28" : i < 8 ? "2026-06-29" : i < 12 ? "2026-06-30" : "2026-07-01",
  })),
  // Round of 16 - 8 matches (Jul 2 - Jul 4)
  ...Array.from({ length: 8 }, (_, i) => ({
    matchOrder: 89 + i,
    phase: "ROUND_16",
    date: i < 4 ? "2026-07-02" : "2026-07-04",
  })),
  // Quarter-finals - 4 matches (Jul 8 - Jul 9)
  ...Array.from({ length: 4 }, (_, i) => ({
    matchOrder: 97 + i,
    phase: "QUARTERS",
    date: i < 2 ? "2026-07-08" : "2026-07-09",
  })),
  // Semi-finals - 2 matches (Jul 13 - Jul 14)
  { matchOrder: 101, phase: "SEMIS", date: "2026-07-13" },
  { matchOrder: 102, phase: "SEMIS", date: "2026-07-14" },
  // Third-place match
  { matchOrder: 103, phase: "THIRD_PLACE", date: "2026-07-18" },
  // Final
  { matchOrder: 104, phase: "FINAL", date: "2026-07-19" },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.championPrediction.deleteMany();
  await prisma.phasePrediction.deleteMany();
  await prisma.matchPrediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();

  // Create teams
  const createdTeams: Record<string, string> = {};
  for (const team of teams) {
    const created = await prisma.team.create({ data: team });
    createdTeams[team.code] = created.id;
  }
  console.log(`Created ${teams.length} teams`);

  // Create group stage matches
  for (const match of groupMatches) {
    await prisma.match.create({
      data: {
        phase: match.phase,
        groupLabel: match.groupLabel,
        matchOrder: match.matchOrder,
        homeTeamId: createdTeams[match.homeCode],
        awayTeamId: createdTeams[match.awayCode],
        matchDate: new Date(`${match.date}T18:00:00Z`),
        status: "SCHEDULED",
      },
    });
  }
  console.log(`Created ${groupMatches.length} group stage matches`);

  // Create knockout round placeholder matches
  for (const match of knockoutMatches) {
    await prisma.match.create({
      data: {
        phase: match.phase,
        matchOrder: match.matchOrder,
        matchDate: new Date(`${match.date}T18:00:00Z`),
        status: "SCHEDULED",
      },
    });
  }
  console.log(`Created ${knockoutMatches.length} knockout stage matches`);

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@bolao.com",
      password: hashedPassword,
      role: "admin",
    },
  });
  console.log("Created admin user (admin@bolao.com / admin123)");

  // Create default settings
  await prisma.settings.createMany({
    data: [
      { key: "GROUP_DEADLINE", value: "2026-06-11T00:00:00Z" },
      { key: "CURRENT_PHASE", value: "GROUP" },
    ],
  });
  console.log("Created default settings");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
