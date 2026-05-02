import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────────
   HERO TROPHY SVG
───────────────────────────────────────────────────────────────── */
function TrophySVG() {
  return (
    <svg
      viewBox="0 0 160 205"
      className="w-28 h-36 mx-auto mb-8"
      fill="none"
      aria-hidden="true"
    >
      {/* Cup bowl */}
      <path
        d="M44 28 Q31 36 29 62 Q26 94 54 110 L61 130 L99 130 L106 110 Q134 94 131 62 Q129 36 116 28 Z"
        fill="white"
      />
      {/* Left handle */}
      <path
        d="M44 46 Q13 55 13 80 Q13 106 44 110"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M116 46 Q147 55 147 80 Q147 106 116 110"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neck */}
      <path d="M68 130 L64 160 L96 160 L92 130 Z" fill="white" />
      {/* Base tier 1 */}
      <rect x="50" y="160" width="60" height="9" rx="2" fill="white" />
      {/* Base tier 2 */}
      <rect x="34" y="169" width="92" height="12" rx="3" fill="white" />
      {/* Base tier 3 */}
      <rect x="20" y="181" width="120" height="9" rx="2" fill="white" />
      {/* Cup shine */}
      <path
        d="M57 43 Q54 68 58 88"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.18"
        fill="none"
      />
      {/* Star on cup */}
      <path
        d="M80 54 L81.8 59.5 H87.5 L82.9 62.9 L84.6 68.5 L80 65.1 L75.4 68.5 L77.1 62.9 L72.5 59.5 H78.2 Z"
        fill="white"
        opacity="0.18"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MODULE ICONS
───────────────────────────────────────────────────────────────── */
function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2 L14.5 7 L12 9 L9.5 7 Z" fill="currentColor" stroke="none" />
      <path d="M9.5 7 L7 9.5 L7.5 13 L12 14.5 L16.5 13 L17 9.5 L14.5 7" strokeWidth="1" />
      <path d="M7.5 13 L5 16.5" strokeWidth="1" />
      <path d="M16.5 13 L19 16.5" strokeWidth="1" />
      <path d="M12 14.5 L12 22" strokeWidth="1" />
      <path d="M2 9 L7 9.5" strokeWidth="1" />
      <path d="M22 9 L17 9.5" strokeWidth="1" />
    </svg>
  );
}

function BracketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="6" height="4" rx="1" />
      <rect x="1" y="10" width="6" height="4" rx="1" />
      <rect x="1" y="16" width="6" height="4" rx="1" />
      <path d="M7 6 H10 V12 H7" fill="none" />
      <path d="M7 18 H10 V12" fill="none" />
      <rect x="11" y="10" width="6" height="4" rx="1" />
      <path d="M17 12 H20" />
      <rect x="20" y="10" width="3" height="4" rx="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

function TrophySmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 4 H16.5 Q17.5 4 17.5 6 L17 11 Q16.5 15 12 16 Q7.5 15 7 11 L6.5 6 Q6.5 4 7.5 4 Z" />
      <path d="M6.5 6.5 Q3.5 7 3.5 10.5 Q3.5 14 6.5 14" />
      <path d="M17.5 6.5 Q20.5 7 20.5 10.5 Q20.5 14 17.5 14" />
      <path d="M12 16 L12 19.5" />
      <path d="M8.5 19.5 H15.5" />
      <path d="M9.5 21.5 H14.5" />
    </svg>
  );
}

function PodiumIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 22 H22" />
      <rect x="8" y="7" width="8" height="15" fill="currentColor" fillOpacity="0.12" />
      <rect x="1.5" y="13" width="7" height="9" fill="currentColor" fillOpacity="0.08" />
      <rect x="15.5" y="16" width="7" height="6" fill="currentColor" fillOpacity="0.08" />
      {/* Star on 1st */}
      <path d="M12 3 L12.7 5.2 H15 L13.2 6.5 L13.9 8.7 L12 7.4 L10.1 8.7 L10.8 6.5 L9 5.2 H11.3 Z" fill="currentColor" fillOpacity="0.5" stroke="none" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREVIEW CARD WRAPPER
───────────────────────────────────────────────────────────────── */
function PreviewCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="border border-green-200 rounded-xl overflow-hidden bg-white select-none">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-green-100">
        <span className="text-[#009C3B]">{icon}</span>
        <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
      </div>
      <div className="relative h-56 overflow-hidden pointer-events-none">
        <div className="p-4">{children}</div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREVIEW: GRUPO
───────────────────────────────────────────────────────────────── */
function GroupPreviewContent() {
  const matches = [
    { date: "11/06", home: "Brasil", away: "México", hs: 2, as: 0 },
    { date: "11/06", home: "Argentina", away: "P. Baixos", hs: 1, as: 1 },
    { date: "13/06", home: "França", away: "Japão", hs: 3, as: 1 },
  ];
  const standings = [
    { pos: 1, code: "BRA", j: 2, sg: "+4", pts: 6 },
    { pos: 2, code: "MEX", j: 2, sg: "0", pts: 3 },
    { pos: 3, code: "ARG", j: 1, sg: "0", pts: 1 },
    { pos: 4, code: "PBX", j: 1, sg: "0", pts: 1 },
  ];
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold">Grupo A</span>
        <span className="text-xs px-2 py-0.5 bg-[#009C3B] text-white rounded font-medium">Salvar</span>
      </div>
      {matches.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400 w-9 shrink-0 text-[10px]">{m.date}</span>
          <span className="flex-1 text-right truncate text-xs">{m.home}</span>
          <span className="w-6 h-6 border border-gray-300 rounded text-center leading-6 text-xs bg-white font-mono">{m.hs}</span>
          <span className="text-gray-400 text-[10px]">×</span>
          <span className="w-6 h-6 border border-gray-300 rounded text-center leading-6 text-xs bg-white font-mono">{m.as}</span>
          <span className="flex-1 truncate text-xs">{m.away}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Classificação (seus palpites)</p>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left font-medium pb-1">#</th>
              <th className="text-left font-medium pb-1">Seleção</th>
              <th className="text-center font-medium pb-1">J</th>
              <th className="text-center font-medium pb-1">SG</th>
              <th className="text-center font-bold pb-1">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.pos} className={s.pos <= 2 ? "font-semibold" : "text-gray-400"}>
                <td className="py-0.5">{s.pos}</td>
                <td className="py-0.5">{s.code}</td>
                <td className="text-center py-0.5">{s.j}</td>
                <td className="text-center py-0.5">{s.sg}</td>
                <td className="text-center font-bold py-0.5">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREVIEW: CLASSIFICAÇÃO
───────────────────────────────────────────────────────────────── */
function ClassificationPreviewContent() {
  const teams = [
    { code: "BRA", sel: true }, { code: "ARG", sel: true }, { code: "FRA", sel: true },
    { code: "ESP", sel: true }, { code: "ENG", sel: true }, { code: "GER", sel: true },
    { code: "POR", sel: true }, { code: "ITA", sel: true }, { code: "NED", sel: false },
    { code: "MEX", sel: false }, { code: "USA", sel: false }, { code: "JPN", sel: false },
    { code: "CRO", sel: false }, { code: "MAR", sel: false }, { code: "URU", sel: false },
    { code: "SEN", sel: false },
  ];
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold">Oitavas de Final</span>
        <span className="text-xs text-gray-400">8/16 selecionadas</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {teams.map((t) => (
          <span
            key={t.code}
            className={`px-2 py-1 text-[11px] rounded-md border font-medium leading-none ${
              t.sel ? "bg-[#009C3B] text-white border-[#009C3B]" : "border-gray-300 text-gray-600"
            }`}
          >
            {t.code}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREVIEW: CAMPEÃO
───────────────────────────────────────────────────────────────── */
function ChampionPreviewContent() {
  const items = [
    { label: "Campeão", pts: "25 pts", value: "Brasil" },
    { label: "Vice", pts: "20 pts", value: "Argentina" },
    { label: "3º Lugar", pts: "15 pts", value: "França" },
  ];
  return (
    <div className="space-y-3">
      {items.map((s) => (
        <div key={s.label}>
          <label className="block text-xs text-gray-500 mb-1">
            {s.label} <span className="text-gray-400 font-normal">({s.pts})</span>
          </label>
          <div className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm flex justify-between items-center bg-white">
            <span className="font-medium">{s.value}</span>
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4 L6 8 L10 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PREVIEW: RANKING
───────────────────────────────────────────────────────────────── */
function RankingPreviewContent() {
  const rows = [
    { pos: 1, name: "João Silva", pts: 287, match: 210 },
    { pos: 2, name: "Maria Santos", pts: 271, match: 198 },
    { pos: 3, name: "Pedro Oliveira", pts: 259, match: 192 },
    { pos: 4, name: "Ana Costa", pts: 248, match: 185 },
    { pos: 5, name: "Carlos Lima", pts: 235, match: 177 },
  ];
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-100">
          <th className="text-left pb-2 font-medium">#</th>
          <th className="text-left pb-2 font-medium">Participante</th>
          <th className="text-right pb-2 font-medium">Jogos</th>
          <th className="text-right pb-2 font-bold">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((r) => (
          <tr key={r.pos} className={r.pos === 1 ? "font-semibold" : ""}>
            <td className="py-1.5 text-gray-500 pr-2">{r.pos}</td>
            <td className="py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                  {r.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <span>{r.name.split(" ")[0]}</span>
              </div>
            </td>
            <td className="py-1.5 text-right text-gray-500">{r.match}</td>
            <td className="py-1.5 text-right font-bold">{r.pts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SCORING — helpers
───────────────────────────────────────────────────────────────── */
function ScoreCard({
  emoji,
  pts,
  title,
  predHome,
  predAway,
  realHome,
  realAway,
  matchHome,
  matchAway,
  outcome,
  highlight,
}: {
  emoji: string;
  pts: number;
  title: string;
  predHome: number;
  predAway: number;
  realHome: number;
  realAway: number;
  /** which scores match between palpite and resultado real */
  matchHome: boolean;
  matchAway: boolean;
  /** small footnote below the scoreboard */
  outcome: string;
  /** featured tier (placar exato) gets thicker border */
  highlight?: boolean;
}) {
  const cellMatch = "text-[#009C3B] font-bold";
  const cellMiss = "text-gray-400";
  const ptsColor =
    pts === 0 ? "text-gray-300" : pts >= 7 ? "text-[#006B2B]" : "text-[#009C3B]";

  return (
    <div
      className={`rounded-xl bg-white p-4 flex flex-col ${
        highlight
          ? "border-2 border-[#009C3B] shadow-[0_4px_12px_rgba(0,156,59,0.15)]"
          : "border border-gray-200"
      }`}
    >
      <div className="text-center mb-3">
        <div className="text-3xl leading-none mb-1.5">{emoji}</div>
        <div className={`text-2xl font-bold tracking-tight ${ptsColor}`}>
          {pts} <span className="text-sm font-medium">pts</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-gray-700 text-center mb-3 leading-snug min-h-[2.4rem]">
        {title}
      </p>
      <div className="bg-gray-50 rounded-lg p-2 space-y-1 mt-auto">
        <div className="flex items-center justify-between text-[10px]">
          <span className="uppercase tracking-wider text-gray-400">
            Palpite
          </span>
          <div className="font-mono text-sm">
            <span className={matchHome ? cellMatch : "text-gray-700"}>
              {predHome}
            </span>
            <span className="text-gray-300 mx-1.5">×</span>
            <span className={matchAway ? cellMatch : "text-gray-700"}>
              {predAway}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="uppercase tracking-wider text-gray-400">Real</span>
          <div className="font-mono text-sm">
            <span className={matchHome ? cellMatch : cellMiss}>{realHome}</span>
            <span className="text-gray-300 mx-1.5">×</span>
            <span className={matchAway ? cellMatch : cellMiss}>{realAway}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2 leading-tight italic">
        {outcome}
      </p>
    </div>
  );
}

function PhaseTier({
  label,
  detail,
  pts,
  emoji,
  highlight,
}: {
  label: string;
  detail: string;
  pts: number;
  emoji: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 sm:flex-col sm:text-center sm:gap-2">
      <div
        className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center font-bold ${
          highlight
            ? "bg-[#FFDF00] text-[#004D20] shadow-md"
            : "bg-[#009C3B] text-white"
        }`}
      >
        <span className="text-base sm:text-lg leading-none">{pts}</span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-80 mt-0.5">
          pts
        </span>
      </div>
      <div className="flex-1 sm:flex-initial min-w-0">
        <div className="flex items-center gap-1.5 sm:justify-center">
          <span className="text-base sm:text-lg">{emoji}</span>
          <p className="text-sm font-bold tracking-tight">{label}</p>
        </div>
        <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight mt-0.5">
          {detail}
        </p>
      </div>
    </div>
  );
}

function Podium() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
      <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-md mx-auto">
        {/* 2º Vice */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-3xl sm:text-4xl mb-1">🥈</span>
          <p className="text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
            Vice
          </p>
          <div className="w-full bg-gradient-to-b from-gray-200 to-gray-300 rounded-t-lg h-20 sm:h-24 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-700">20</p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500">
                pts
              </p>
            </div>
          </div>
        </div>

        {/* 1º Campeão */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-4xl sm:text-5xl mb-1">🏆</span>
          <p className="text-xs sm:text-sm font-bold text-[#006B2B] mb-1">
            Campeão
          </p>
          <div className="w-full bg-gradient-to-b from-[#FFDF00] to-[#EDD000] rounded-t-lg h-28 sm:h-32 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-[#004D20]">
                25
              </p>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-[#004D20] font-medium">
                pts
              </p>
            </div>
          </div>
        </div>

        {/* 3º Lugar */}
        <div className="flex-1 flex flex-col items-center">
          <span className="text-3xl sm:text-4xl mb-1">🥉</span>
          <p className="text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
            3º Lugar
          </p>
          <div className="w-full bg-gradient-to-b from-orange-200 to-orange-300 rounded-t-lg h-14 sm:h-16 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-orange-900">
                15
              </p>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-orange-800">
                pts
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-gray-400 mt-4 italic">
        Você palpita os 3 antes do início da Copa.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect(session.user.role === "admin" ? "/admin/resultados" : "/dashboard");

  return (
    <div className="-mt-6 -mx-4">

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="bg-[#006B2B] text-white">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <TrophySVG />
          <p className="text-xs tracking-[0.3em] uppercase text-[#FFDF00] mb-3 font-medium">
            Copa do Mundo FIFA 2026
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4">
            Bolão Copa 2026
          </h1>
          <p className="text-green-100 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Faça seus palpites, preveja os classificados e dispute com seus amigos num ranking ao vivo.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/registro"
              className="bg-[#FFDF00] text-[#004D20] px-8 py-3 rounded-md font-semibold hover:bg-[#EDD000] transition-colors"
            >
              Criar Conta
            </Link>
            <Link
              href="/login"
              className="border border-white/30 text-white px-8 py-3 rounded-md font-medium hover:bg-white/10 transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight">Como funciona</h2>
            <p className="text-gray-500 text-sm mt-1.5">
              Palpite nos jogos, preveja os classificados e acompanhe o ranking em tempo real
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <PreviewCard icon={<BallIcon />} title="Palpites da Fase de Grupos">
              <GroupPreviewContent />
            </PreviewCard>
            <PreviewCard icon={<BracketIcon />} title="Previsão de Classificados">
              <ClassificationPreviewContent />
            </PreviewCard>
            <PreviewCard icon={<TrophySmIcon />} title="Campeão, Vice e 3º Lugar">
              <ChampionPreviewContent />
            </PreviewCard>
            <PreviewCard icon={<PodiumIcon />} title="Ranking dos Participantes">
              <RankingPreviewContent />
            </PreviewCard>
          </div>
        </div>
      </section>

      {/* ── Como ganhar pontos ───────────────────────── */}
      <section className="py-16 px-4 bg-green-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-[#009C3B] mb-2 font-semibold">
              Pontuação
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Como você ganha pontos
            </h2>
            <p className="text-gray-500 text-sm mt-2 max-w-xl mx-auto">
              Três formas de pontuar — quanto melhor seu palpite, mais pontos. Aqui está o resumo visual:
            </p>
          </div>

          {/* === BLOCO 1: PALPITES DE PLACAR === */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-9 h-9 rounded-full bg-[#FFDF00] text-[#004D20] flex items-center justify-center text-sm font-bold shrink-0">
                1
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Palpites de placar
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-12">
              Em cada jogo da Copa, você palpita o placar. Veja quanto vale cada nível de acerto:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <ScoreCard
                emoji="🥇"
                pts={7}
                title="Placar exato"
                predHome={2}
                predAway={0}
                realHome={2}
                realAway={0}
                matchHome
                matchAway
                outcome="Acertou os dois gols"
                highlight
              />
              <ScoreCard
                emoji="🥈"
                pts={4}
                title="Vencedor + gols de um time"
                predHome={2}
                predAway={0}
                realHome={2}
                realAway={1}
                matchHome
                matchAway={false}
                outcome="Brasil ganhou e fez 2 gols"
              />
              <ScoreCard
                emoji="🥉"
                pts={3}
                title="Apenas vencedor ou empate certo"
                predHome={2}
                predAway={0}
                realHome={3}
                realAway={1}
                matchHome={false}
                matchAway={false}
                outcome="Acertou só o vencedor"
              />
              <ScoreCard
                emoji="⚽"
                pts={1}
                title="Errou vencedor mas acertou gols de um time"
                predHome={2}
                predAway={0}
                realHome={2}
                realAway={3}
                matchHome
                matchAway={false}
                outcome="Brasil fez 2 mas perdeu"
              />
              <ScoreCard
                emoji="❌"
                pts={0}
                title="Errou tudo"
                predHome={2}
                predAway={0}
                realHome={0}
                realAway={1}
                matchHome={false}
                matchAway={false}
                outcome="Vencedor e gols errados"
              />
            </div>

            <p className="text-xs text-gray-500 mt-5 text-center sm:text-left sm:ml-12">
              <span className="inline-block bg-white border border-green-200 rounded-md px-3 py-1.5">
                💡 Vale sempre a <strong>maior pontuação aplicável</strong> — não é cumulativa.
              </span>
            </p>
          </div>

          {/* === BLOCO 2: CLASSIFICADOS === */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-9 h-9 rounded-full bg-[#FFDF00] text-[#004D20] flex items-center justify-center text-sm font-bold shrink-0">
                2
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Acertar quais seleções avançam
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-12">
              Antes de cada fase eliminatória você prevê os classificados. Quanto mais avançada a fase, mais pontos por time correto:
            </p>

            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-7">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-5 sm:gap-3 items-start">
                <PhaseTier
                  pts={2}
                  emoji="🎯"
                  label="Segunda Fase"
                  detail="32 times classificados"
                />
                <PhaseTier
                  pts={4}
                  emoji="🎯"
                  label="Oitavas"
                  detail="32 → 16 times"
                />
                <PhaseTier
                  pts={6}
                  emoji="🎯"
                  label="Quartas"
                  detail="16 → 8 times"
                />
                <PhaseTier
                  pts={8}
                  emoji="🎯"
                  label="Semis"
                  detail="8 → 4 times"
                />
                <PhaseTier
                  pts={14}
                  emoji="⭐"
                  label="Finalistas"
                  detail="2 times na grande final"
                  highlight
                />
              </div>

              {/* Setas de progressão (só desktop) */}
              <div className="hidden sm:flex items-center justify-between mt-5 px-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-5 text-center sm:text-left sm:ml-12">
              <span className="inline-block bg-white border border-green-200 rounded-md px-3 py-1.5">
                💡 Você ganha pontos por <strong>cada time</strong> que classifica corretamente.
              </span>
            </p>
          </div>

          {/* === BLOCO 3: PÓDIO === */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-9 h-9 rounded-full bg-[#FFDF00] text-[#004D20] flex items-center justify-center text-sm font-bold shrink-0">
                3
              </span>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Acertar o pódio da Copa
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-12">
              Antes do início da Copa, você palpita Campeão, Vice e Terceiro Colocado:
            </p>

            <Podium />
          </div>

          {/* === Resumo final === */}
          <div className="mt-12 bg-[#006B2B] text-white rounded-xl p-6 text-center">
            <p className="text-sm text-green-100 mb-1">Pontuação máxima possível por jogo</p>
            <p className="text-3xl font-bold tracking-tight">
              <span className="text-[#FFDF00]">7</span>{" "}
              <span className="text-base font-medium opacity-80">pts (placar exato)</span>
            </p>
            <p className="text-xs text-green-200 mt-3 max-w-md mx-auto">
              Some os pontos de jogos + classificados + pódio para definir sua posição no ranking ao vivo.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-green-100 py-8 px-4 text-center bg-white">
        <p className="text-xs text-green-700 tracking-wide">
          Todos direitos reservado a Bruno Lanzo. 2026
        </p>
      </footer>

    </div>
  );
}
