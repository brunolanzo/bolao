"use client";

import { useState } from "react";

interface Setting {
  key: string;
  value: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  code: string;
}

interface Props {
  settings: Setting[];
  users: User[];
  teams: Team[];
}

export default function AdminSettings({ settings: initialSettings, users, teams }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const s of initialSettings) {
      obj[s.key] = s.value;
    }
    return obj;
  });
  const [saving, setSaving] = useState(false);
  const [championId, setChampionId] = useState("");
  const [runnerUpId, setRunnerUpId] = useState("");
  const [thirdPlaceId, setThirdPlaceId] = useState("");

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateSettings", data: settings }),
      });
      alert("Configurações salvas!");
    } finally {
      setSaving(false);
    }
  }

  async function promoteUser(userId: string) {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "promoteAdmin", data: { userId } }),
    });
    window.location.reload();
  }

  async function calculateChampionPoints() {
    if (!championId || !runnerUpId || !thirdPlaceId) {
      alert("Selecione campeão, vice e 3º lugar");
      return;
    }
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "calculateChampionPoints",
        data: { championId, runnerUpId, thirdPlaceId },
      }),
    });
    alert("Pontos de campeão calculados!");
  }

  return (
    <div className="space-y-8">
      {/* Deadlines */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold mb-3">Deadlines</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Deadline Fase de Grupos (ISO 8601)
            </label>
            <input
              type="text"
              value={settings.GROUP_DEADLINE || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, GROUP_DEADLINE: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="2026-06-11T00:00:00Z"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Fase Atual
            </label>
            <select
              value={settings.CURRENT_PHASE || "GROUP"}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, CURRENT_PHASE: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="GROUP">Fase de Grupos</option>
              <option value="ROUND_32">32 avos</option>
              <option value="ROUND_16">Oitavas</option>
              <option value="QUARTERS">Quartas</option>
              <option value="SEMIS">Semifinais</option>
              <option value="FINAL">Final</option>
            </select>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>

      {/* Champion points */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold mb-3">Definir Campeão / Vice / 3º Lugar</h2>
        <p className="text-sm text-gray-500 mb-3">
          Ao definir, os pontos serão calculados para todos os participantes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Campeão</label>
            <select
              value={championId}
              onChange={(e) => setChampionId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecione</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Vice</label>
            <select
              value={runnerUpId}
              onChange={(e) => setRunnerUpId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecione</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">3º Lugar</label>
            <select
              value={thirdPlaceId}
              onChange={(e) => setThirdPlaceId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecione</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={calculateChampionPoints}
          className="bg-black text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800"
        >
          Calcular Pontos de Campeão
        </button>
      </div>

      {/* Users */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="font-bold mb-3">Usuários ({users.length})</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between text-sm border-b border-gray-100 py-2 last:border-0"
            >
              <div>
                <span className="font-medium">{user.name}</span>
                <span className="text-gray-400 ml-2">{user.email}</span>
                {user.role === "admin" && (
                  <span className="text-xs bg-black text-white px-2 py-0.5 rounded ml-2">
                    admin
                  </span>
                )}
              </div>
              {user.role !== "admin" && (
                <button
                  onClick={() => promoteUser(user.id)}
                  className="text-xs border border-gray-300 px-2 py-1 rounded hover:border-gray-400"
                >
                  Tornar Admin
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
