import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const users = await prisma.user.findMany({
    where: { role: "user" },
    include: {
      matchPredictions: {
        where: { points: { not: null } },
      },
      phasePredictions: {
        where: { points: { not: null } },
      },
      championPrediction: true,
    },
  });

  const ranking = users
    .map((user) => {
      const matchPoints = user.matchPredictions.reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      const phasePoints = user.phasePredictions.reduce(
        (sum, p) => sum + (p.points || 0),
        0
      );
      const champPoints =
        (user.championPrediction?.championPoints || 0) +
        (user.championPrediction?.runnerUpPoints || 0) +
        (user.championPrediction?.thirdPlacePoints || 0);

      return {
        id: user.id,
        name: user.name,
        matchPoints,
        phasePoints,
        champPoints,
        totalPoints: matchPoints + phasePoints + champPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Classificação geral dos participantes do bolão
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Participante</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                Jogos
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                Fases
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                Campeão
              </th>
              <th className="text-center px-4 py-3 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhuma pontuação registrada ainda
                </td>
              </tr>
            ) : (
              ranking.map((user, i) => (
                <tr
                  key={user.id}
                  className={`border-t border-gray-100 ${
                    user.id === session.user.id ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`${
                        i < 3 ? "font-bold" : "text-gray-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={i < 3 ? "font-medium" : ""}>
                      {user.name}
                    </span>
                    {user.id === session.user.id && (
                      <span className="text-xs text-gray-400 ml-2">(você)</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-3 hidden sm:table-cell text-gray-500">
                    {user.matchPoints}
                  </td>
                  <td className="text-center px-4 py-3 hidden sm:table-cell text-gray-500">
                    {user.phasePoints}
                  </td>
                  <td className="text-center px-4 py-3 hidden sm:table-cell text-gray-500">
                    {user.champPoints}
                  </td>
                  <td className="text-center px-4 py-3 font-bold">{user.totalPoints}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
