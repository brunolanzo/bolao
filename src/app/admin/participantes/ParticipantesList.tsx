"use client";

import { useState } from "react";
import type { Participante, NextMatchInfo } from "./page";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      <span>{ok ? "✓" : "✗"}</span>
      {label}
    </span>
  );
}

export default function ParticipantesList({
  participantes,
  currentUserId,
  nextMatch,
}: {
  participantes: Participante[];
  currentUserId: string;
  nextMatch: NextMatchInfo | null;
}) {
  const [list, setList] = useState(participantes);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deleteUser(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao excluir.");
        return;
      }
      setList((prev) => prev.filter((p) => p.id !== id));
      setConfirmId(null);
    } catch {
      setError("Erro de conexão ao excluir.");
    } finally {
      setDeletingId(null);
    }
  }

  if (list.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum participante cadastrado ainda.</p>;
  }

  // Summary counts
  const fullyDone = list.filter(
    (p) => p.groupPredictions >= p.groupTotal && p.groupTotal > 0 && p.bracketDone && p.paid
  ).length;
  const nextMatchPending = nextMatch
    ? list.filter((p) => !p.nextMatchDone).length
    : 0;

  return (
    <div className="space-y-4">
      {/* Próximo jogo */}
      {nextMatch && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              ⏭️ Próximo jogo
            </p>
            <p className="text-sm font-medium truncate">
              {nextMatch.label}{" "}
              <span className="text-gray-400 font-normal">· {nextMatch.when}</span>
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
              nextMatchPending > 0
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-green-100 text-green-700 border border-green-200"
            }`}
          >
            {nextMatchPending > 0
              ? `${nextMatchPending} ${nextMatchPending === 1 ? "pendente" : "pendentes"}`
              : "Todos preencheram ✓"}
          </span>
        </div>
      )}

      {/* Resumo */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-gray-500">
          Total: <strong className="text-gray-800">{list.length}</strong>
        </span>
        <span className="text-gray-500">
          Completos (grupos + mata-mata + pago):{" "}
          <strong className="text-green-700">{fullyDone}</strong>
        </span>
        <span className="text-gray-500">
          Com pendência:{" "}
          <strong className="text-amber-700">{list.length - fullyDone}</strong>
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {list.map((p) => {
          const groupsOk = p.groupTotal > 0 && p.groupPredictions >= p.groupTotal;
          const isSelf = p.id === currentUserId;
          return (
            <div
              key={p.id}
              className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-gray-400 truncate">{p.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {nextMatch && (
                  <StatusPill ok={p.nextMatchDone} label="Próximo jogo" />
                )}
                <StatusPill
                  ok={groupsOk}
                  label={`Grupos ${p.groupPredictions}/${p.groupTotal}`}
                />
                <StatusPill ok={p.bracketDone} label="Mata-mata" />
                <StatusPill ok={p.paid} label="Pagamento" />
                <StatusPill ok={p.bankDone} label="Dados bancários" />
              </div>

              <div className="shrink-0">
                {confirmId === p.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 font-medium">Excluir?</span>
                    <button
                      onClick={() => deleteUser(p.id)}
                      disabled={deletingId === p.id}
                      className="text-xs bg-red-600 text-white px-2.5 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === p.id ? "Excluindo…" : "Confirmar"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      disabled={deletingId === p.id}
                      className="text-xs border border-gray-300 px-2.5 py-1 rounded hover:border-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(p.id)}
                    disabled={isSelf}
                    title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir participante"}
                    className="text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
