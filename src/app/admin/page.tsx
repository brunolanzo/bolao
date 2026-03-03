import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  const totalUsers = await prisma.user.count({ where: { role: "user" } });
  const totalPredictions = await prisma.matchPrediction.count();
  const finishedMatches = await prisma.match.count({
    where: { status: "FINISHED" },
  });
  const totalGroupMatches = await prisma.match.count({
    where: { phase: "GROUP" },
  });
  const currentPhase = await prisma.settings.findUnique({
    where: { key: "CURRENT_PHASE" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Painel de Administração</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Participantes</p>
          <p className="text-3xl font-bold mt-1">{totalUsers}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Palpites</p>
          <p className="text-3xl font-bold mt-1">{totalPredictions}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Jogos Finalizados</p>
          <p className="text-3xl font-bold mt-1">
            {finishedMatches}/{totalGroupMatches}
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Fase Atual</p>
          <p className="text-lg font-bold mt-1">{currentPhase?.value || "GROUP"}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/resultados"
          className="border border-gray-200 rounded-lg p-6 hover:border-gray-400 transition-colors"
        >
          <h3 className="font-bold mb-1">Atualizar Resultados</h3>
          <p className="text-sm text-gray-500">
            Inserir ou atualizar placares dos jogos
          </p>
        </Link>
        <Link
          href="/admin/fases"
          className="border border-gray-200 rounded-lg p-6 hover:border-gray-400 transition-colors"
        >
          <h3 className="font-bold mb-1">Gerenciar Fases</h3>
          <p className="text-sm text-gray-500">
            Definir classificados e confrontos das eliminatórias
          </p>
        </Link>
        <Link
          href="/admin/configuracoes"
          className="border border-gray-200 rounded-lg p-6 hover:border-gray-400 transition-colors"
        >
          <h3 className="font-bold mb-1">Configurações</h3>
          <p className="text-sm text-gray-500">
            Deadlines, usuários e configurações gerais
          </p>
        </Link>
      </div>
    </div>
  );
}
