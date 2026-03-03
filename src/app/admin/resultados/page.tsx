import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminResults from "./AdminResults";

export const dynamic = "force-dynamic";

export default async function ResultadosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchOrder: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Atualizar Resultados</h1>
        <p className="text-gray-500 text-sm mt-1">
          Insira ou atualize os placares dos jogos. Ao finalizar, os pontos serão calculados automaticamente.
        </p>
      </div>
      <AdminResults matches={JSON.parse(JSON.stringify(matches))} />
    </div>
  );
}
