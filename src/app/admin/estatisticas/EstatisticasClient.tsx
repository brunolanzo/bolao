"use client";

import { useState } from "react";
import type { RankedTeam, MatchOption, TeamOption, GroupPendingUser, ExactHitMatch, UserOption, ParticipantRank, PhasePointRanking, NextMatchPending } from "./page";
import type { TeamDistribution } from "@/app/api/admin/stats/team/route";
import type { HeadToHead } from "@/app/api/admin/stats/head-to-head/route";
import { formatName } from "@/lib/formatName";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }
  return (
    <button
      onClick={copy}
      className="text-xs font-medium border border-green-300 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-50 transition-colors shrink-0"
    >
      {copied ? "✓ Copiado!" : "📋 Copiar pro WhatsApp"}
    </button>
  );
}

function medal(i: number): string {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
}

function rankingToText(title: string, ranking: RankedTeam[]): string {
  const lines = ranking
    .slice(0, 10)
    .map((r, i) => `${medal(i)} ${r.name} — ${r.count} ${r.count === 1 ? "aposta" : "apostas"} (${r.pct}%)`);
  return `${title}\n\n${lines.join("\n")}`;
}

// --- Pending lists ---

function PendingListCard({
  title,
  emoji,
  defaultOpen,
  copyText,
  children,
}: {
  title: string;
  emoji: string;
  defaultOpen?: boolean;
  copyText: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left">
          <span className="text-gray-400 text-xs">{open ? "▼" : "▶"}</span>
          <h3 className="font-bold">{emoji} {title}</h3>
        </button>
        <CopyButton text={copyText} />
      </div>
      {open && children}
    </div>
  );
}

function PendingSection({
  unpaidUsers,
  groupPendingUsers,
  bracketPendingUsers,
  groupTotal,
  nextMatchPending,
}: {
  unpaidUsers: string[];
  groupPendingUsers: GroupPendingUser[];
  bracketPendingUsers: string[];
  groupTotal: number;
  nextMatchPending: NextMatchPending;
}) {
  const nextMatchText =
    !nextMatchPending.label
      ? "✅ *Próximo jogo — Nosso Bolão 2026*\n\nNenhum próximo jogo no momento."
      : nextMatchPending.users.length === 0
        ? `✅ *Próximo jogo: ${nextMatchPending.label}*\n\nTodos já palpitaram!`
        : `⏭️ *Falta palpitar — ${nextMatchPending.label} (Nosso Bolão 2026)*\n\n${nextMatchPending.users.map((n) => `• ${formatName(n)}`).join("\n")}`;

  const unpaidText =
    unpaidUsers.length === 0
      ? "✅ *Pagamentos — Nosso Bolão 2026*\n\nTodos os participantes já pagaram!"
      : `💸 *Pagamento pendente — Nosso Bolão 2026*\n\n${unpaidUsers.map((n) => `• ${formatName(n)}`).join("\n")}`;

  const groupText =
    groupPendingUsers.length === 0
      ? "✅ *Fase de grupos — Nosso Bolão 2026*\n\nTodos terminaram de preencher!"
      : `⏳ *Fase de grupos incompleta — Nosso Bolão 2026*\n\n${groupPendingUsers.map((u) => `• ${formatName(u.name)} (${u.done}/${groupTotal})`).join("\n")}`;

  const bracketText =
    bracketPendingUsers.length === 0
      ? "✅ *Chaveamento/campeão — Nosso Bolão 2026*\n\nTodos preencheram o chaveamento!"
      : `🗓️ *Chaveamento/campeão pendente — Nosso Bolão 2026*\n\n${bracketPendingUsers.map((n) => `• ${formatName(n)}`).join("\n")}`;

  return (
    <div className="space-y-3">
      {nextMatchPending.label && (
        <PendingListCard
          title={`Próximo jogo — falta palpitar`}
          emoji="⏭️"
          copyText={nextMatchText}
        >
          <p className="text-[11px] text-gray-400 mb-2 -mt-1">{nextMatchPending.label}</p>
          {nextMatchPending.users.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">✅ Todos já palpitaram o próximo jogo!</p>
          ) : (
            <ul className="space-y-1">
              {nextMatchPending.users.map((n) => (
                <li key={n} className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  {formatName(n)}
                </li>
              ))}
            </ul>
          )}
        </PendingListCard>
      )}

      <PendingListCard title="Pagamento pendente" emoji="💸" copyText={unpaidText}>
        {unpaidUsers.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">✅ Todos pagaram!</p>
        ) : (
          <ul className="space-y-1">
            {unpaidUsers.map((n) => (
              <li key={n} className="text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {formatName(n)}
              </li>
            ))}
          </ul>
        )}
      </PendingListCard>

      <PendingListCard title="Fase de grupos incompleta" emoji="⏳" copyText={groupText} defaultOpen={false}>
        {groupPendingUsers.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">✅ Todos terminaram os grupos!</p>
        ) : (
          <ul className="space-y-1">
            {groupPendingUsers.map((u) => (
              <li key={u.name} className="text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>{formatName(u.name)}</span>
                <span className="text-xs text-gray-400 ml-auto">{u.done}/{groupTotal}</span>
              </li>
            ))}
          </ul>
        )}
      </PendingListCard>

      <PendingListCard title="Grupos prontos, sem chaveamento" emoji="🗓️" copyText={bracketText} defaultOpen={false}>
        {bracketPendingUsers.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">✅ Todos preencheram o chaveamento!</p>
        ) : (
          <ul className="space-y-1">
            {bracketPendingUsers.map((n) => (
              <li key={n} className="text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                {formatName(n)}
              </li>
            ))}
          </ul>
        )}
      </PendingListCard>
    </div>
  );
}

// --- Ranking cards ---

function RankingCard({
  title,
  emoji,
  ranking,
  total,
  defaultOpen = true,
}: {
  title: string;
  emoji: string;
  ranking: RankedTeam[];
  total: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const waText = rankingToText(`${emoji} *${title} — Nosso Bolão 2026*`, ranking);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-gray-400 text-xs">{open ? "▼" : "▶"}</span>
          <h3 className="font-bold">{emoji} {title}</h3>
          <span className="text-xs text-gray-400">({total} apostas)</span>
        </button>
        {ranking.length > 0 && <CopyButton text={waText} />}
      </div>

      {open && (
        ranking.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma aposta registrada ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {ranking.slice(0, 10).map((r, i) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-7 shrink-0 text-center">{medal(i)}</span>
                <span className="w-32 shrink-0 font-medium truncate">{r.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-gray-600 text-xs">
                  {r.count} · {r.pct}%
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// --- Participant rankings (group exact hits + per-phase points) ---

function ParticipantRankingCard({
  title,
  emoji,
  subtitle,
  ranking,
  formatValue,
  waTitle,
  emptyText,
  defaultOpen = true,
}: {
  title: string;
  emoji: string;
  subtitle?: string;
  ranking: ParticipantRank[];
  formatValue: (v: number) => string;
  waTitle: string;
  emptyText: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const max = ranking.length > 0 ? ranking[0].value : 0;
  // For phase point rankings, append "X acertos (Y%)" — teams correctly
  // predicted to reach the phase, out of how many were picked.
  const acertosSuffix = (r: ParticipantRank): string => {
    if (r.acertos == null) return "";
    return ` · ${r.acertos} ${r.acertos === 1 ? "acerto" : "acertos"}`;
  };
  const waText =
    ranking.length > 0
      ? `${waTitle}\n\n` +
        ranking
          .slice(0, 10)
          .map((r, i) => `${medal(i)} ${formatName(r.name)} — ${formatValue(r.value)}${acertosSuffix(r)}`)
          .join("\n")
      : `${waTitle}\n\n${emptyText}`;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left">
          <span className="text-gray-400 text-xs">{open ? "▼" : "▶"}</span>
          <div>
            <h3 className="font-bold">{emoji} {title}</h3>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </button>
        {ranking.length > 0 && <CopyButton text={waText} />}
      </div>

      {open && (
        ranking.length === 0 ? (
          <p className="text-sm text-gray-400">{emptyText}</p>
        ) : (
          <div className="space-y-1.5">
            {ranking.slice(0, 10).map((r, i) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-7 shrink-0 text-center">{medal(i)}</span>
                <span className="w-32 shrink-0 font-medium truncate">{formatName(r.name)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{ width: `${max > 0 ? Math.round((r.value / max) * 100) : 0}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-gray-600 text-xs">
                  <span className="font-medium text-gray-700">{formatValue(r.value)}</span>
                  {r.acertos != null ? (
                    <span className="text-gray-400">
                      {" · "}
                      {r.acertos} ✓
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function ParticipantRankingsSection({
  groupExactRanking,
  phasePointRankings,
}: {
  groupExactRanking: ParticipantRank[];
  phasePointRankings: PhasePointRanking[];
}) {
  return (
    <div className="space-y-3">
      <ParticipantRankingCard
        title="Placares cravados — Fase de Grupos"
        emoji="🎯"
        subtitle="Quem mais acertou o placar exato (7 pts) nos jogos da 1ª fase"
        ranking={groupExactRanking}
        formatValue={(v) => `${v} ${v === 1 ? "cravado" : "cravados"}`}
        waTitle="🎯 *Placares cravados — Fase de Grupos (Nosso Bolão 2026)*"
        emptyText="Ninguém cravou um placar na fase de grupos ainda."
      />
      {phasePointRankings.map((pr) => (
        <ParticipantRankingCard
          key={pr.phase}
          title={`Pontuação — ${pr.label}`}
          emoji="📊"
          subtitle="Pontos de placar + bônus de classificação nesta fase"
          ranking={pr.ranking}
          formatValue={(v) => `${v} pts`}
          waTitle={`📊 *Pontuação — ${pr.label} (Nosso Bolão 2026)*`}
          emptyText="Ainda sem pontuação nesta fase."
          defaultOpen={false}
        />
      ))}
    </div>
  );
}

// --- Team analyzer ---

const STAGES: { key: keyof TeamDistribution; label: string; emoji: string; color: string }[] = [
  { key: "champion",   label: "Campeão",          emoji: "🏆", color: "bg-yellow-400" },
  { key: "runnerUp",   label: "Vice-campeão",      emoji: "🥈", color: "bg-gray-300"  },
  { key: "thirdPlace", label: "3º Lugar",          emoji: "🥉", color: "bg-orange-300"},
  { key: "fourthPlace",label: "4º Lugar",          emoji: "4️⃣", color: "bg-blue-300"  },
  { key: "quarters",   label: "Quartas de final",  emoji: "⚡", color: "bg-green-400" },
  { key: "round16",    label: "Oitavas de final",  emoji: "🔵", color: "bg-blue-400"  },
  { key: "round32",    label: "2ª Fase (16 avos)", emoji: "🔹", color: "bg-indigo-300"},
  { key: "groups",     label: "Fase de grupos",    emoji: "❌", color: "bg-red-300"   },
];

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

interface TeamStats {
  team: { id: string; name: string };
  total: number;
  distribution: TeamDistribution;
}

function TeamAnalyzer({ teams }: { teams: TeamOption[] }) {
  const [selected, setSelected] = useState("");
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(teamId: string) {
    setSelected(teamId);
    setStats(null);
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/team?teamId=${teamId}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } finally {
      setLoading(false);
    }
  }

  function waText(s: TeamStats): string {
    const lines = STAGES
      .filter((st) => s.distribution[st.key] > 0)
      .map((st) => {
        const n = s.distribution[st.key];
        return `${st.emoji} ${st.label}: ${n} (${pct(n, s.total)}%)`;
      });
    return `⚽ *${s.team.name} — Até onde vai? (Nosso Bolão 2026)*\n\n${lines.join("\n")}`;
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold mb-3">⚽ Análise por seleção</h3>
      <select
        value={selected}
        onChange={(e) => load(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
      >
        <option value="">Selecione uma seleção…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {loading && <p className="text-sm text-gray-400">Carregando…</p>}

      {stats && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">{stats.total} participantes</span>
            <CopyButton text={waText(stats)} />
          </div>
          <div className="space-y-2">
            {STAGES.map((st) => {
              const n = stats.distribution[st.key];
              return (
                <div key={st.key} className="flex items-center gap-3 text-sm">
                  <span className="w-5 shrink-0 text-center text-base leading-none">{st.emoji}</span>
                  <span className="w-36 shrink-0 truncate">{st.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`${st.color} h-full rounded-full transition-all`}
                      style={{ width: `${pct(n, stats.total)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-gray-600 text-xs">
                    {n} · {pct(n, stats.total)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Match analyzer ---

interface MatchStats {
  match: {
    phase: string;
    groupLabel: string | null;
    status: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
  };
  total: number;
  distribution: { homeWin: number; draw: number; awayWin: number };
  topScores: { score: string; count: number }[];
  isFinished: boolean;
  realScore: string | null;
  exactHits: number;
  topPicks: { position: number; name: string; homeScore: number; awayScore: number }[];
}

function MatchAnalyzer({ matchOptions }: { matchOptions: MatchOption[] }) {
  const [selected, setSelected] = useState("");
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(matchId: string) {
    setSelected(matchId);
    setStats(null);
    if (!matchId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/match?matchId=${matchId}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } finally {
      setLoading(false);
    }
  }

  function waText(s: MatchStats): string {
    const { match: m, distribution: d, total } = s;
    let txt = `⚽ *${m.homeTeam} × ${m.awayTeam} — Nosso Bolão 2026*\n\n`;
    txt += `📊 ${total} ${total === 1 ? "palpite" : "palpites"}:\n`;
    txt += `🏠 ${m.homeTeam}: ${d.homeWin} (${pct(d.homeWin, total)}%)\n`;
    txt += `🤝 Empate: ${d.draw} (${pct(d.draw, total)}%)\n`;
    txt += `🛫 ${m.awayTeam}: ${d.awayWin} (${pct(d.awayWin, total)}%)\n`;
    if (s.topScores.length > 0) {
      txt += `\n🎯 Placares mais apostados:\n`;
      txt += s.topScores.map((t) => `• ${t.score} (${t.count}×)`).join("\n");
    }
    if (s.topPicks.length > 0) {
      txt += `\n\n👑 Palpites dos 3 primeiros:\n`;
      txt += s.topPicks
        .map((p) => `${p.position}º (${formatName(p.name)}): ${m.homeTeam} ${p.homeScore} x ${p.awayScore} ${m.awayTeam}`)
        .join("\n");
    }
    if (s.isFinished) {
      txt += `\n\n✅ Resultado real: ${s.realScore}\n`;
      txt += `🔥 Cravaram o placar exato: ${s.exactHits} ${s.exactHits === 1 ? "pessoa" : "pessoas"}`;
    }
    return txt;
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold mb-3">⚽ Análise por jogo</h3>
      <select
        value={selected}
        onChange={(e) => load(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
      >
        <option value="">Selecione um jogo…</option>
        {matchOptions.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>

      {loading && <p className="text-sm text-gray-400">Carregando…</p>}

      {stats && (
        <div className="space-y-4">
          {stats.total === 0 ? (
            <p className="text-sm text-gray-400">Nenhum palpite para este jogo ainda.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">{stats.total} palpites</span>
                <CopyButton text={waText(stats)} />
              </div>

              <div className="space-y-2">
                {[
                  { label: stats.match.homeTeam, val: stats.distribution.homeWin, color: "bg-green-500" },
                  { label: "Empate", val: stats.distribution.draw, color: "bg-gray-400" },
                  { label: stats.match.awayTeam, val: stats.distribution.awayWin, color: "bg-blue-500" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 font-medium truncate">{row.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${row.color} h-full rounded-full`}
                        style={{ width: `${pct(row.val, stats.total)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-gray-600 text-xs">
                      {row.val} · {pct(row.val, stats.total)}%
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Placares mais apostados
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.topScores.map((t) => (
                    <span key={t.score} className="text-sm border border-gray-200 rounded-md px-2.5 py-1 bg-gray-50">
                      <strong>{t.score}</strong>{" "}
                      <span className="text-gray-400 text-xs">×{t.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {stats.topPicks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">👑 Palpites dos 3 primeiros</p>
                  {stats.topPicks.map((pick) => (
                    <div key={pick.position} className="text-sm">
                      <span className="text-gray-500">{pick.position}º </span>
                      <strong>{formatName(pick.name)}</strong>
                      {": "}
                      <strong>
                        {stats.match.homeTeam} {pick.homeScore} x {pick.awayScore} {stats.match.awayTeam}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {stats.isFinished && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-sm">
                    ✅ Resultado real: <strong>{stats.realScore}</strong>
                  </p>
                  <p className="text-sm mt-1">
                    🔥 Cravaram o placar exato:{" "}
                    <strong>{stats.exactHits}</strong>{" "}
                    {stats.exactHits === 1 ? "pessoa" : "pessoas"}{" "}
                    <span className="text-gray-400 text-xs">
                      ({pct(stats.exactHits, stats.total)}%)
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Exact-score hits (placares cravados) ---

function ExactHitsCard({ matches }: { matches: ExactHitMatch[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const selected = selectedIdx !== null ? matches[selectedIdx] : null;

  function waText(m: ExactHitMatch): string {
    const hitterLine =
      m.hitters.length > 0
        ? `🎯 Cravaram: ${m.hitters.map(formatName).join(", ")}`
        : `😅 Ninguém cravou`;
    return `🎯 *Placar cravado — Nosso Bolão 2026*\n\n⚽ ${m.label}\n${hitterLine}`;
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold mb-3">🎯 Placares cravados</h3>

      {matches.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum jogo finalizado ainda.</p>
      ) : (
        <>
          <select
            value={selectedIdx ?? ""}
            onChange={(e) => setSelectedIdx(e.target.value === "" ? null : Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
          >
            <option value="">Selecione um jogo finalizado…</option>
            {matches.map((m, i) => (
              <option key={i} value={i}>{m.label}</option>
            ))}
          </select>

          {selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">
                  {selected.hitters.length > 0
                    ? `${selected.hitters.length} ${selected.hitters.length === 1 ? "pessoa cravou" : "pessoas cravaram"}`
                    : "Ninguém cravou"}
                </span>
                <CopyButton text={waText(selected)} />
              </div>

              {selected.hitters.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-gray-400">🎯 cravaram:</span>
                  {selected.hitters.map((h) => (
                    <span key={h} className="text-xs bg-green-50 border border-green-200 text-green-700 rounded px-1.5 py-0.5 font-medium">
                      {formatName(h)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">😅 Ninguém cravou o placar exato neste jogo.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Individual user performance ---

interface UserStats {
  name: string;
  rankingPosition: number;
  totalParticipants: number;
  totalPoints: number;
  totalMatchPts: number;
  totalPhasePts: number;
  totalChampPts: number;
  exactScores: number;
  finishedMatches: number;
  correctOutcomes: number;
  championPick: string | null;
  runnerUpPick: string | null;
  thirdPlacePick: string | null;
  matchResults: { matchLabel: string; predicted: string; actual: string; points: number }[];
}

function positionLabel(pos: number): string {
  return `${pos}°`;
}

function UserAnalyzer({ users }: { users: UserOption[] }) {
  const [selected, setSelected] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function load(userId: string) {
    setSelected(userId);
    setStats(null);
    setShowAll(false);
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/user?userId=${userId}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } finally {
      setLoading(false);
    }
  }

  function waText(s: UserStats): string {
    let txt = `📊 *Desempenho de ${formatName(s.name)} — Nosso Bolão 2026*\n\n`;
    txt += `📍 Posição: ${positionLabel(s.rankingPosition)} de ${s.totalParticipants} participantes\n`;
    txt += `⭐ Pontuação: ${s.totalPoints} pts`;
    if (s.finishedMatches > 0) {
      const pctCorrect = pct(s.correctOutcomes, s.finishedMatches);
      txt += `\n\n⚽ Jogos finalizados: ${s.finishedMatches}\n`;
      txt += `✅ Resultados acertados: ${s.correctOutcomes} (${pctCorrect}%)\n`;
      txt += `🎯 Placares cravados: ${s.exactScores}`;
    }
    if (s.championPick || s.runnerUpPick || s.thirdPlacePick) {
      txt += `\n\n🏆 Aposta de campeão: ${s.championPick ?? "—"}\n`;
      txt += `🥈 Vice: ${s.runnerUpPick ?? "—"}\n`;
      txt += `🥉 3º lugar: ${s.thirdPlacePick ?? "—"}`;
    }
    return txt;
  }

  const visibleResults = stats
    ? showAll
      ? stats.matchResults
      : stats.matchResults.slice(0, 8)
    : [];

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold mb-3">👤 Desempenho individual</h3>

      <select
        value={selected}
        onChange={(e) => load(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
      >
        <option value="">Selecione um participante…</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{formatName(u.name)}</option>
        ))}
      </select>

      {loading && <p className="text-sm text-gray-400">Carregando…</p>}

      {stats && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-[#006B2B]">
                {positionLabel(stats.rankingPosition)}
              </span>
              <div>
                <p className="font-semibold text-sm leading-tight">{formatName(stats.name)}</p>
                <p className="text-xs text-gray-400">de {stats.totalParticipants} participantes</p>
              </div>
            </div>
            <CopyButton text={waText(stats)} />
          </div>

          {/* Points breakdown */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Total", value: stats.totalPoints, highlight: true },
              { label: "Placares", value: stats.totalMatchPts },
              { label: "Fases", value: stats.totalPhasePts },
              { label: "Campeão", value: stats.totalChampPts },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-lg px-3 py-2 text-center ${item.highlight ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-100"}`}
              >
                <p className={`text-lg font-bold ${item.highlight ? "text-[#006B2B]" : "text-gray-700"}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Accuracy */}
          {stats.finishedMatches > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Finalizados", value: stats.finishedMatches, emoji: "⚽" },
                { label: "Acertos", value: `${stats.correctOutcomes} (${pct(stats.correctOutcomes, stats.finishedMatches)}%)`, emoji: "✅" },
                { label: "Cravados", value: stats.exactScores, emoji: "🎯" },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm font-bold text-gray-700">{item.emoji} {item.value}</p>
                  <p className="text-xs text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Champion picks */}
          {(stats.championPick || stats.runnerUpPick || stats.thirdPlacePick) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Apostas finais</p>
              {[
                { emoji: "🏆", label: "Campeão", value: stats.championPick },
                { emoji: "🥈", label: "Vice", value: stats.runnerUpPick },
                { emoji: "🥉", label: "3º lugar", value: stats.thirdPlacePick },
              ].map((item) => item.value && (
                <p key={item.label} className="text-sm">
                  {item.emoji} <span className="text-gray-500">{item.label}:</span>{" "}
                  <strong>{item.value}</strong>
                </p>
              ))}
            </div>
          )}

          {/* Match results */}
          {stats.matchResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Palpites em jogos finalizados
              </p>
              <div className="space-y-1">
                {visibleResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span
                      className={`w-7 shrink-0 text-center font-bold rounded px-1 py-0.5 ${
                        r.points === 7
                          ? "bg-yellow-100 text-yellow-700"
                          : r.points >= 3
                          ? "bg-green-100 text-green-700"
                          : "bg-red-50 text-red-400"
                      }`}
                    >
                      {r.points >= 3 ? `+${r.points}` : "✗"}
                    </span>
                    <span className="flex-1 truncate text-gray-600">{r.matchLabel}</span>
                    <span className="shrink-0 font-mono text-gray-500">{r.predicted}</span>
                    <span className="shrink-0 text-gray-300">→</span>
                    <span className="shrink-0 font-mono text-gray-700 font-medium">{r.actual}</span>
                  </div>
                ))}
              </div>
              {stats.matchResults.length > 8 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-2 text-xs text-green-700 hover:underline"
                >
                  {showAll ? "Mostrar menos" : `Ver todos (${stats.matchResults.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Head-to-head (confronto direto entre dois participantes) ---

function H2HRow({
  label,
  aVal,
  bVal,
  aWins,
  bWins,
}: {
  label: string;
  aVal: string | number;
  bVal: string | number;
  aWins: boolean;
  bWins: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span
        className={`w-16 sm:w-20 shrink-0 text-right font-bold tabular-nums ${
          aWins ? "text-[#006B2B]" : "text-gray-400"
        }`}
      >
        {aVal}
      </span>
      <span className="flex-1 text-center text-xs text-gray-500">{label}</span>
      <span
        className={`w-16 sm:w-20 shrink-0 text-left font-bold tabular-nums ${
          bWins ? "text-[#006B2B]" : "text-gray-400"
        }`}
      >
        {bVal}
      </span>
    </div>
  );
}

function HeadToHeadAnalyzer({ users }: { users: UserOption[] }) {
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [data, setData] = useState<HeadToHead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextA: string, nextB: string) {
    setData(null);
    setError(null);
    if (!nextA || !nextB || nextA === nextB) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/head-to-head?a=${nextA}&b=${nextB}`);
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || "Erro ao carregar confronto");
    } catch {
      setError("Erro ao carregar confronto");
    } finally {
      setLoading(false);
    }
  }

  function onChangeA(v: string) {
    setAId(v);
    load(v, bId);
  }
  function onChangeB(v: string) {
    setBId(v);
    load(aId, v);
  }

  function waText(d: HeadToHead): string {
    const { a, b } = d;
    let txt = `⚔️ *Confronto direto — Nosso Bolão 2026*\n\n`;
    txt += `${formatName(a.name)} (${a.position}º)  🆚  ${formatName(b.name)} (${b.position}º)\n\n`;
    if (d.comparedMatches > 0) {
      txt += `🥊 Em ${d.comparedMatches} jogos que ambos palpitaram:\n`;
      txt += `• ${formatName(a.name)} pontuou mais: ${d.aWins}\n`;
      txt += `• Empates: ${d.draws}\n`;
      txt += `• ${formatName(b.name)} pontuou mais: ${d.bWins}\n\n`;
    }
    txt += `⭐ Pontos totais: ${a.totalPoints} x ${b.totalPoints}\n`;
    txt += `⚽ Placares: ${a.totalMatchPts} x ${b.totalMatchPts}\n`;
    txt += `📈 Fases: ${a.totalPhasePts} x ${b.totalPhasePts}\n`;
    txt += `🏆 Campeão: ${a.totalChampPts} x ${b.totalChampPts}\n`;
    txt += `🎯 Placares cravados: ${a.exactScores} x ${b.exactScores}\n`;
    txt += `✅ Acertos de resultado: ${a.correctOutcomes} x ${b.correctOutcomes}`;
    return txt;
  }

  const a = data?.a;
  const b = data?.b;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold mb-3">⚔️ Confronto direto</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <select
          value={aId}
          onChange={(e) => onChangeA(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#009C3B]"
        >
          <option value="">Participante A…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} disabled={u.id === bId}>
              {formatName(u.name)}
            </option>
          ))}
        </select>
        <select
          value={bId}
          onChange={(e) => onChangeB(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Participante B…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} disabled={u.id === aId}>
              {formatName(u.name)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Carregando…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && a && b && (
        <div className="space-y-4">
          {/* Names header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-right">
              <p className="font-semibold text-sm leading-tight truncate">{formatName(a.name)}</p>
              <p className="text-xs text-gray-400">{a.position}º de {data.totalParticipants}</p>
            </div>
            <span className="text-gray-300 font-bold text-sm shrink-0">VS</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm leading-tight truncate">{formatName(b.name)}</p>
              <p className="text-xs text-gray-400">{b.position}º de {data.totalParticipants}</p>
            </div>
          </div>

          {/* Head-to-head duel tally */}
          {data.comparedMatches > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 text-center">
                🥊 {data.comparedMatches} jogos que ambos palpitaram
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className={`w-10 shrink-0 text-right font-bold ${data.aWins > data.bWins ? "text-[#006B2B]" : "text-gray-500"}`}>
                  {data.aWins}
                </span>
                <div className="flex-1 flex h-3 rounded-full overflow-hidden bg-gray-100">
                  <div className="bg-[#009C3B]" style={{ width: `${pct(data.aWins, data.comparedMatches)}%` }} />
                  <div className="bg-gray-300" style={{ width: `${pct(data.draws, data.comparedMatches)}%` }} />
                  <div className="bg-blue-500" style={{ width: `${pct(data.bWins, data.comparedMatches)}%` }} />
                </div>
                <span className={`w-10 shrink-0 text-left font-bold ${data.bWins > data.aWins ? "text-[#006B2B]" : "text-gray-500"}`}>
                  {data.bWins}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-1">
                pontuou mais · {data.draws} {data.draws === 1 ? "empate" : "empates"}
              </p>
            </div>
          )}

          {/* Stat-by-stat comparison */}
          <div>
            <H2HRow label="⭐ Pontos totais" aVal={a.totalPoints} bVal={b.totalPoints} aWins={a.totalPoints > b.totalPoints} bWins={b.totalPoints > a.totalPoints} />
            <H2HRow label="📍 Posição" aVal={`${a.position}º`} bVal={`${b.position}º`} aWins={a.position < b.position} bWins={b.position < a.position} />
            <H2HRow label="⚽ Placares" aVal={a.totalMatchPts} bVal={b.totalMatchPts} aWins={a.totalMatchPts > b.totalMatchPts} bWins={b.totalMatchPts > a.totalMatchPts} />
            <H2HRow label="📈 Fases" aVal={a.totalPhasePts} bVal={b.totalPhasePts} aWins={a.totalPhasePts > b.totalPhasePts} bWins={b.totalPhasePts > a.totalPhasePts} />
            <H2HRow label="🏆 Campeão" aVal={a.totalChampPts} bVal={b.totalChampPts} aWins={a.totalChampPts > b.totalChampPts} bWins={b.totalChampPts > a.totalChampPts} />
            <H2HRow label="🎯 Cravados" aVal={a.exactScores} bVal={b.exactScores} aWins={a.exactScores > b.exactScores} bWins={b.exactScores > a.exactScores} />
            <H2HRow
              label="✅ Acertos"
              aVal={`${a.correctOutcomes} (${pct(a.correctOutcomes, a.finishedMatches)}%)`}
              bVal={`${b.correctOutcomes} (${pct(b.correctOutcomes, b.finishedMatches)}%)`}
              aWins={a.correctOutcomes > b.correctOutcomes}
              bWins={b.correctOutcomes > a.correctOutcomes}
            />
          </div>

          {/* Champion picks side by side */}
          {(a.championPick || b.championPick || a.runnerUpPick || b.runnerUpPick) && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 text-center">Apostas finais</p>
              {[
                { emoji: "🏆", aPick: a.championPick, bPick: b.championPick },
                { emoji: "🥈", aPick: a.runnerUpPick, bPick: b.runnerUpPick },
                { emoji: "🥉", aPick: a.thirdPlacePick, bPick: b.thirdPlacePick },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-right truncate font-medium">{row.aPick ?? "—"}</span>
                  <span className="shrink-0">{row.emoji}</span>
                  <span className="flex-1 text-left truncate font-medium">{row.bPick ?? "—"}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <CopyButton text={waText(data)} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main export ---

export default function EstatisticasClient({
  champions,
  runnersUp,
  thirdPlaces,
  popularScores,
  totalPreds,
  matchOptions,
  teams,
  unpaidUsers,
  groupPendingUsers,
  bracketPendingUsers,
  groupTotal,
  exactHitMatches,
  userOptions,
  groupExactRanking,
  phasePointRankings,
  nextMatchPending,
}: {
  champions: { ranking: RankedTeam[]; total: number };
  runnersUp: { ranking: RankedTeam[]; total: number };
  thirdPlaces: { ranking: RankedTeam[]; total: number };
  popularScores: { score: string; count: number; pct: number }[];
  totalPreds: number;
  matchOptions: MatchOption[];
  teams: TeamOption[];
  unpaidUsers: string[];
  groupPendingUsers: GroupPendingUser[];
  bracketPendingUsers: string[];
  groupTotal: number;
  exactHitMatches: ExactHitMatch[];
  userOptions: UserOption[];
  groupExactRanking: ParticipantRank[];
  phasePointRankings: PhasePointRanking[];
  nextMatchPending: NextMatchPending;
}) {
  const popularText =
    `🎯 *Placares mais apostados (geral) — Nosso Bolão 2026*\n\n` +
    popularScores
      .map((p, i) => `${i + 1}. ${p.score} — ${p.count} palpites (${p.pct}%)`)
      .join("\n");

  return (
    <div className="space-y-8">
      {/* Desempenho individual */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Desempenho individual
        </h2>
        <UserAnalyzer users={userOptions} />
      </section>

      {/* Confronto direto */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Confronto direto
        </h2>
        <HeadToHeadAnalyzer users={userOptions} />
      </section>

      {/* Rankings de participantes */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Rankings de participantes
        </h2>
        <ParticipantRankingsSection
          groupExactRanking={groupExactRanking}
          phasePointRankings={phasePointRankings}
        />
      </section>

      {/* Pendências */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Pendências
        </h2>
        <PendingSection
          unpaidUsers={unpaidUsers}
          groupPendingUsers={groupPendingUsers}
          bracketPendingUsers={bracketPendingUsers}
          groupTotal={groupTotal}
          nextMatchPending={nextMatchPending}
        />
      </section>

      {/* Análise por seleção */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Até onde vai a seleção?
        </h2>
        <TeamAnalyzer teams={teams} />
      </section>

      {/* Campeões */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Apostas de classificação final
        </h2>
        <RankingCard title="Campeões mais apostados" emoji="🏆" ranking={champions.ranking} total={champions.total} />
        <RankingCard title="Vices mais apostados" emoji="🥈" ranking={runnersUp.ranking} total={runnersUp.total} defaultOpen={false} />
        <RankingCard title="Terceiros mais apostados" emoji="🥉" ranking={thirdPlaces.ranking} total={thirdPlaces.total} defaultOpen={false} />
      </section>

      {/* Por jogo */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Análise por partida
        </h2>
        <MatchAnalyzer matchOptions={matchOptions} />
      </section>

      {/* Placares cravados */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Placares cravados
        </h2>
        <ExactHitsCard matches={exactHitMatches} />
      </section>

      {/* Bônus */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Curiosidades
        </h2>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold">🎯 Placares mais apostados (geral)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Mandante ou visitante contam como o mesmo placar</p>
            </div>
            {popularScores.length > 0 && <CopyButton text={popularText} />}
          </div>
          {popularScores.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum palpite registrado ainda.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {popularScores.map((p) => (
                  <span key={p.score} className="text-sm border border-gray-200 rounded-md px-2.5 py-1 bg-gray-50">
                    <strong>{p.score}</strong>{" "}
                    <span className="text-gray-400 text-xs">×{p.count} · {p.pct}%</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Base: {totalPreds} palpites de placar no total.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
