import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") redirect("/");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOf7Days = new Date(now);
  startOf7Days.setDate(now.getDate() - 6);
  startOf7Days.setHours(0, 0, 0, 0);

  const [totalUsers, totalPredictions, finishedMatches, totalMatches, currentPhase] =
    await Promise.all([
      prisma.user.count({ where: { role: "user" } }),
      prisma.matchPrediction.count(),
      prisma.match.count({ where: { status: "FINISHED" } }),
      prisma.match.count(),
      prisma.settings.findUnique({ where: { key: "CURRENT_PHASE" } }),
    ]);

  // PageView queries wrapped in try/catch — table may not exist yet in production
  let totalViews = 0;
  let viewsToday = 0;
  let viewsWeek = 0;
  let topPages: { path: string; _count: { id: number } }[] = [];
  let dailyViews: { day: string; count: number }[] = [];
  let pageViewReady = true;

  try {
    [totalViews, viewsToday, viewsWeek, topPages, dailyViews] = await Promise.all([
      prisma.pageView.count(),
      prisma.pageView.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.pageView.count({ where: { createdAt: { gte: startOf7Days } } }),
      prisma.pageView.groupBy({
        by: ["path"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.$queryRaw<{ day: string; count: number }[]>`
        SELECT
          strftime('%Y-%m-%d', createdAt) AS day,
          COUNT(*) AS count
        FROM PageView
        WHERE createdAt >= ${startOf7Days.toISOString()}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);
  } catch {
    pageViewReady = false;
  }

  // Build a full 7-day array (fill missing days with 0)
  const dayMap = new Map(dailyViews.map((r) => [r.day, Number(r.count)]));
  const last7: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
    last7.push({ label, count: dayMap.get(key) ?? 0 });
  }
  const maxCount = Math.max(...last7.map((d) => d.count), 1);

  const phaseLabel: Record<string, string> = {
    GROUP: "Grupos",
    ROUND_32: "32 avos",
    ROUND_16: "Oitavas",
    QUARTERS: "Quartas",
    SEMIS: "Semis",
    FINAL: "Final",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel de Administração</h1>
      </div>

      {/* ── Bolão stats ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bolão</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Participantes</p>
            <p className="text-3xl font-bold mt-1">{totalUsers}</p>
          </div>
          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Palpites</p>
            <p className="text-3xl font-bold mt-1">{totalPredictions}</p>
          </div>
          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Jogos Finalizados</p>
            <p className="text-3xl font-bold mt-1">
              {finishedMatches}/{totalMatches}
            </p>
          </div>
          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Fase Atual</p>
            <p className="text-lg font-bold mt-1">
              {phaseLabel[currentPhase?.value ?? "GROUP"] ?? currentPhase?.value ?? "GROUP"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Visualizações ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Visualizações</h2>

        {/* Aviso: migração pendente */}
        {!pageViewReady && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <span className="text-amber-500 text-lg leading-none">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Tabela de visitas ainda não criada</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Vá em{" "}
                <a href="/admin/configuracoes" className="underline font-medium">
                  Configurações → Migrações de Banco
                </a>{" "}
                e clique em <strong>Criar tabela PageView</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-3xl font-bold mt-1 text-blue-700">{totalViews.toLocaleString("pt-BR")}</p>
          </div>
          <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Hoje</p>
            <p className="text-3xl font-bold mt-1 text-blue-700">{viewsToday.toLocaleString("pt-BR")}</p>
          </div>
          <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Últimos 7 dias</p>
            <p className="text-3xl font-bold mt-1 text-blue-700">{viewsWeek.toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Gráfico de barras — últimos 7 dias */}
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Visitas por dia</p>
          <div className="flex items-end gap-1.5 h-20">
            {last7.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-medium">{count > 0 ? count : ""}</span>
                <div
                  className="w-full rounded-t bg-blue-400 transition-all"
                  style={{ height: `${Math.max((count / maxCount) * 56, count > 0 ? 4 : 2)}px` }}
                />
                <span className="text-[9px] text-gray-400 leading-none text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top páginas */}
        {topPages.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Páginas mais visitadas</p>
            <div className="space-y-2">
              {topPages.map((p) => (
                <div key={p.path} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-mono text-xs truncate">{p.path || "/"}</span>
                  <span className="font-semibold text-gray-800 ml-4 shrink-0">{p._count.id.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ações</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/participantes" className="border border-green-200 rounded-lg p-6 hover:border-[#009C3B] transition-colors">
            <h3 className="font-bold mb-1">Participantes</h3>
            <p className="text-sm text-gray-500">Pendências de palpites, pagamento e exclusão</p>
          </Link>
          <Link href="/admin/estatisticas" className="border border-green-200 rounded-lg p-6 hover:border-[#009C3B] transition-colors">
            <h3 className="font-bold mb-1">Estatísticas</h3>
            <p className="text-sm text-gray-500">Apostas de campeões e análise por jogo pro WhatsApp</p>
          </Link>
          <Link href="/admin/resultados" className="border border-green-200 rounded-lg p-6 hover:border-[#009C3B] transition-colors">
            <h3 className="font-bold mb-1">Atualizar Resultados</h3>
            <p className="text-sm text-gray-500">Inserir ou atualizar placares dos jogos</p>
          </Link>
          <Link href="/admin/pagamentos" className="border border-green-200 rounded-lg p-6 hover:border-[#009C3B] transition-colors">
            <h3 className="font-bold mb-1">Pagamentos</h3>
            <p className="text-sm text-gray-500">Controlar pagamentos e dados bancários</p>
          </Link>
          <Link href="/admin/configuracoes" className="border border-green-200 rounded-lg p-6 hover:border-[#009C3B] transition-colors">
            <h3 className="font-bold mb-1">Configurações</h3>
            <p className="text-sm text-gray-500">Deadlines, usuários e configurações gerais</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
