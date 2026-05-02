import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

type StepStatus =
  | "complete"
  | "pending"
  | "locked-complete"
  | "locked-incomplete"
  | "unavailable";

function StepCard({
  number,
  title,
  subtitle,
  detail,
  status,
  href,
}: {
  number: number;
  title: string;
  subtitle: string;
  detail?: string;
  status: StepStatus;
  href: string;
}) {
  const isActionable =
    status === "pending" || status === "complete" || status === "locked-complete";

  const circleClass: Record<StepStatus, string> = {
    complete: "bg-green-500 text-white",
    pending: "bg-amber-400 text-white",
    "locked-complete": "bg-gray-300 text-white",
    "locked-incomplete": "bg-orange-400 text-white",
    unavailable: "bg-gray-200 text-gray-400",
  };

  const borderClass: Record<StepStatus, string> = {
    complete: "border-green-200 bg-green-50",
    pending: "border-amber-200 bg-amber-50",
    "locked-complete": "border-gray-200 bg-gray-50",
    "locked-incomplete": "border-orange-200 bg-orange-50",
    unavailable: "border-gray-100 bg-white",
  };

  const badge: Record<StepStatus, { text: string; cls: string }> = {
    complete: { text: "Completo", cls: "bg-green-100 text-green-700" },
    pending: { text: "Pendente", cls: "bg-amber-100 text-amber-700" },
    "locked-complete": { text: "Encerrado", cls: "bg-gray-100 text-gray-500" },
    "locked-incomplete": {
      text: "Prazo encerrado",
      cls: "bg-orange-100 text-orange-700",
    },
    unavailable: { text: "Ainda não disponível", cls: "bg-gray-100 text-gray-400" },
  };

  const icon: Record<StepStatus, string> = {
    complete: "✓",
    pending: "!",
    "locked-complete": "🔒",
    "locked-incomplete": "🔒",
    unavailable: "–",
  };

  const card = (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${borderClass[status]} ${
        isActionable && status !== "complete" && status !== "locked-complete"
          ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          : isActionable
          ? "hover:shadow-sm cursor-pointer"
          : "opacity-60"
      }`}
    >
      {/* Step circle */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${circleClass[status]}`}
      >
        {status === "complete" || status === "locked-complete" ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : status === "locked-incomplete" ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <span>{icon[status]}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-sm ${status === "unavailable" ? "text-gray-400" : "text-gray-900"}`}>
            {title}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge[status].cls}`}>
            {badge[status].text}
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${status === "unavailable" ? "text-gray-400" : "text-gray-500"}`}>
          {subtitle}
        </p>
        {detail && status !== "unavailable" && (
          <p className="text-xs font-medium mt-1 text-gray-700">{detail}</p>
        )}
      </div>

      {/* Arrow */}
      {isActionable && (
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (!isActionable) return card;
  return <Link href={href}>{card}</Link>;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "admin") redirect("/admin/resultados");

  const userId = session.user.id;
  const now = new Date();

  // GROUP_DEADLINE
  const deadlineSetting = await prisma.settings.findUnique({
    where: { key: "GROUP_DEADLINE" },
  });
  const isGroupLocked = deadlineSetting
    ? now > new Date(deadlineSetting.value)
    : false;

  // ── Step 1: Group predictions ───────────────────────────────────────────
  const [totalGroupMatches, userGroupPredCount] = await Promise.all([
    prisma.match.count({ where: { phase: "GROUP" } }),
    prisma.matchPrediction.count({
      where: { userId, match: { phase: "GROUP" } },
    }),
  ]);
  const groupComplete =
    totalGroupMatches > 0 && userGroupPredCount === totalGroupMatches;

  // ── Step 2: Chaveamento + Campeão ──────────────────────────────────────
  const TOTAL_PHASE_PREDS = 62; // 32+16+8+4+2
  const [userPhasePredCount, champPred] = await Promise.all([
    prisma.phasePrediction.count({ where: { userId } }),
    prisma.championPrediction.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);
  const phaseComplete = userPhasePredCount >= TOTAL_PHASE_PREDS;
  const chaveamentoComplete = phaseComplete && !!champPred;

  // ── Step 3: Open knockout predictions ──────────────────────────────────
  const openKnockoutMatches = await prisma.match.findMany({
    where: {
      phase: { not: "GROUP" },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      matchDate: { gt: now },
      status: "SCHEDULED",
    },
    select: { id: true },
  });
  const userKnockoutPredCount =
    openKnockoutMatches.length > 0
      ? await prisma.matchPrediction.count({
          where: {
            userId,
            matchId: { in: openKnockoutMatches.map((m) => m.id) },
          },
        })
      : 0;
  const hasOpenKnockout = openKnockoutMatches.length > 0;
  const knockoutComplete =
    hasOpenKnockout && userKnockoutPredCount === openKnockoutMatches.length;

  // ── Step 4: Payment ─────────────────────────────────────────────────────
  const payment = await prisma.payment.findUnique({
    where: { userId },
    select: { paid: true },
  });
  const paymentPaid = payment?.paid ?? false;

  // ── Step 5: Bank details ────────────────────────────────────────────────
  const bankDetails = await prisma.bankDetails.findUnique({
    where: { userId },
    select: { id: true },
  });
  const hasBankDetails = !!bankDetails;

  // ── Overall done? ───────────────────────────────────────────────────────
  const knockoutOk = !hasOpenKnockout || knockoutComplete;
  const allDone =
    groupComplete &&
    chaveamentoComplete &&
    knockoutOk &&
    paymentPaid &&
    hasBankDetails;

  const completedCount = [
    groupComplete || (isGroupLocked && groupComplete),
    chaveamentoComplete || (isGroupLocked && chaveamentoComplete),
    knockoutOk,
    paymentPaid,
    hasBankDetails,
  ].filter(Boolean).length;

  // Determine each step's status
  const groupStatus: StepStatus = isGroupLocked
    ? groupComplete
      ? "locked-complete"
      : "locked-incomplete"
    : groupComplete
    ? "complete"
    : "pending";

  const chaveamentoStatus: StepStatus = isGroupLocked
    ? chaveamentoComplete
      ? "locked-complete"
      : "locked-incomplete"
    : chaveamentoComplete
    ? "complete"
    : "pending";

  const knockoutStatus: StepStatus = !hasOpenKnockout
    ? "unavailable"
    : knockoutComplete
    ? "complete"
    : "pending";

  const paymentStatus: StepStatus = paymentPaid ? "complete" : "pending";
  const bankStatus: StepStatus = hasBankDetails ? "complete" : "pending";

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-1">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {session.user.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {allDone
            ? "Está tudo pronto. Agora é só torcer!"
            : "Acompanhe o que falta antes de torcer."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{completedCount} de 5 etapas concluídas</span>
          <span>{Math.round((completedCount / 5) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${
              completedCount === 5 ? "bg-green-500" : "bg-[#009C3B]"
            }`}
            style={{ width: `${(completedCount / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <StepCard
          number={1}
          title="Palpites da Fase de Grupos"
          subtitle="Palpite o placar de todos os 72 jogos da fase de grupos"
          detail={
            groupComplete
              ? `${totalGroupMatches} jogos palpitados ✓`
              : `${userGroupPredCount} de ${totalGroupMatches} jogos preenchidos`
          }
          status={groupStatus}
          href="/palpites/grupos"
        />

        <StepCard
          number={2}
          title="Chaveamento e Campeão"
          subtitle="Preveja os classificados de cada fase e o pódio da Copa"
          detail={
            chaveamentoComplete
              ? "Classificados e pódio preenchidos ✓"
              : !champPred
              ? `Classificados: ${userPhasePredCount}/${TOTAL_PHASE_PREDS} · Pódio: não preenchido`
              : `Classificados: ${userPhasePredCount}/${TOTAL_PHASE_PREDS} · Pódio: preenchido`
          }
          status={chaveamentoStatus}
          href="/palpites/classificacao"
        />

        <StepCard
          number={3}
          title="Palpites das Eliminatórias"
          subtitle={
            !hasOpenKnockout
              ? "Disponível após o fim da fase de grupos"
              : `${openKnockoutMatches.length} jogo${openKnockoutMatches.length > 1 ? "s" : ""} aguardando seus palpites`
          }
          detail={
            hasOpenKnockout && !knockoutComplete
              ? `${userKnockoutPredCount} de ${openKnockoutMatches.length} preenchidos`
              : hasOpenKnockout
              ? `${openKnockoutMatches.length} jogos palpitados ✓`
              : undefined
          }
          status={knockoutStatus}
          href="/palpites/eliminatorias"
        />

        <StepCard
          number={4}
          title="Pagamento do Bolão"
          subtitle={
            paymentPaid
              ? "Inscrição confirmada"
              : "Confirme sua participação pagando a entrada"
          }
          status={paymentStatus}
          href="/pagamento"
        />

        <StepCard
          number={5}
          title="Dados para Receber o Prêmio"
          subtitle={
            hasBankDetails
              ? "Dados bancários cadastrados"
              : "Preencha seus dados para receber o prêmio caso vença"
          }
          status={bankStatus}
          href="/pagamento"
        />
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="mt-6 bg-[#006B2B] text-white rounded-xl p-5 text-center">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-bold text-lg">Tudo certo! Agora é só torcer!</p>
          <p className="text-green-200 text-sm mt-1 mb-4">
            Você completou todas as etapas. Acompanhe sua posição no ranking.
          </p>
          <Link
            href="/ranking"
            className="inline-block bg-[#FFDF00] text-[#004D20] font-semibold px-6 py-2 rounded-lg hover:bg-[#EDD000] transition-colors text-sm"
          >
            Ver Ranking →
          </Link>
        </div>
      )}

      {/* Quick links */}
      {!allDone && (
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/ranking" className="text-xs text-gray-400 hover:text-[#006B2B] transition-colors">
            Ver Ranking
          </Link>
          <span className="text-gray-200">·</span>
          <Link href="/regulamento" className="text-xs text-gray-400 hover:text-[#006B2B] transition-colors">
            Regulamento
          </Link>
        </div>
      )}
    </div>
  );
}
