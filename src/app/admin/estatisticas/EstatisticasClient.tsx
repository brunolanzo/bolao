"use client";

import { useState } from "react";
import type { RankedTeam, MatchOption } from "./page";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older browsers
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
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
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
      txt += s.topScores
        .map((t) => `• ${t.score} (${t.count}×)`)
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
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
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

              {/* Distribuição vitória/empate/vitória */}
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

              {/* Placares mais apostados */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Placares mais apostados
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.topScores.map((t) => (
                    <span
                      key={t.score}
                      className="text-sm border border-gray-200 rounded-md px-2.5 py-1 bg-gray-50"
                    >
                      <strong>{t.score}</strong>{" "}
                      <span className="text-gray-400 text-xs">×{t.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Resultado real + cravadas */}
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

export default function EstatisticasClient({
  champions,
  runnersUp,
  thirdPlaces,
  popularScores,
  totalPreds,
  matchOptions,
}: {
  champions: { ranking: RankedTeam[]; total: number };
  runnersUp: { ranking: RankedTeam[]; total: number };
  thirdPlaces: { ranking: RankedTeam[]; total: number };
  popularScores: { score: string; count: number; pct: number }[];
  totalPreds: number;
  matchOptions: MatchOption[];
}) {
  const popularText =
    `🎯 *Placares mais apostados (geral) — Nosso Bolão 2026*\n\n` +
    popularScores
      .map((p, i) => `${i + 1}. ${p.score} — ${p.count} palpites (${p.pct}%)`)
      .join("\n");

  return (
    <div className="space-y-8">
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

      {/* Bônus */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Curiosidades
        </h2>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-bold">🎯 Placares mais apostados (geral)</h3>
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
