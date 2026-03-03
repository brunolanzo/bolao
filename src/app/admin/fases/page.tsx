import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminPhases from "./AdminPhases";

export const dynamic = "force-dynamic";

export default async function FasesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  const teams = await prisma.team.findMany({
    orderBy: [{ groupLabel: "asc" }, { name: "asc" }],
  });

  const knockoutMatches = await prisma.match.findMany({
    where: { phase: { not: "GROUP" } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchOrder: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Gerenciar Fases</h1>
        <p className="text-gray-500 text-sm mt-1">
          Defina os classificados de cada fase e configure os confrontos das eliminatórias.
        </p>
      </div>
      <AdminPhases
        teams={JSON.parse(JSON.stringify(teams))}
        knockoutMatches={JSON.parse(JSON.stringify(knockoutMatches))}
      />
    </div>
  );
}
