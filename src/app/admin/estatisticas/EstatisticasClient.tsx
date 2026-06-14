"use client";

import { useState } from "react";
import type { RankedTeam, MatchOption, TeamOption, GroupPendingUser, ExactHitMatch } from "./page";
import type { TeamDistribution } from "@/app/api/admin/stats/team/route";
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
}: {
  unpaidUsers: string[];
  groupPendingUsers: GroupPendingUser[];
  bracketPendingUsers: string[];
  groupTotal: number;
}) {
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
  leaderPick: { name: string; homeScore: number; awayScore: number } | null;
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
    if (s.leaderPick) {
      txt += `\n\n👑 Palpite do líder (${formatName(s.leaderPick.name)}): ${m.homeTeam} ${s.leaderPick.homeScore} x ${s.leaderPick.awayScore} ${m.awayTeam}`;
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

              {stats.leaderPick && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-sm">
                    👑 Palpite do líder{" "}
                    <strong>{formatName(stats.leaderPick.name)}</strong>:{" "}
                    <strong>
                      {stats.match.homeTeam} {stats.leaderPick.homeScore} x{" "}
                      {stats.leaderPick.awayScore} {stats.match.awayTeam}
                    </strong>
                  </p>
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
}) {
  const popularText =
    `🎯 *Placares mais apostados (geral) — Nosso Bolão 2026*\n\n` +
    popularScores
      .map((p, i) => `${i + 1}. ${p.score} — ${p.count} palpites (${p.pct}%)`)
      .join("\n");

  return (
    <div className="space-y-8">
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
