"use client";

import { useState, useEffect } from "react";

interface UserPayment {
  id: string;
  name: string;
  email: string;
  paid: boolean;
  paidAt: string | null;
  bankDetails: {
    fullName: string;
    cpf: string;
    bank: string;
    agency: string;
    account: string;
    pix: string;
  } | null;
}

export default function PaymentsAdmin() {
  const [users, setUsers] = useState<UserPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    const res = await fetch("/api/admin/payments");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function togglePayment(userId: string, currentPaid: boolean) {
    setToggling(userId);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, paid: !currentPaid }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, paid: !currentPaid, paidAt: !currentPaid ? new Date().toISOString() : null }
              : u
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (filter === "paid") return u.paid;
    if (filter === "unpaid") return !u.paid;
    return true;
  });

  const totalUsers = users.length;
  const paidCount = users.filter((u) => u.paid).length;
  const unpaidCount = totalUsers - paidCount;
  const totalArrecadado = paidCount * 50;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Participantes</p>
          <p className="text-3xl font-bold mt-1">{totalUsers}</p>
        </div>
        <div className="border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Pagos</p>
          <p className="text-3xl font-bold mt-1 text-[#009C3B]">{paidCount}</p>
        </div>
        <div className="border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-3xl font-bold mt-1 text-yellow-600">{unpaidCount}</p>
        </div>
        <div className="border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Arrecadado</p>
          <p className="text-2xl font-bold mt-1">R$ {totalArrecadado}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "paid", "unpaid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
              filter === f
                ? "bg-[#009C3B] text-white border-[#009C3B]"
                : "border-gray-300 hover:border-[#009C3B]"
            }`}
          >
            {f === "all" ? "Todos" : f === "paid" ? "Pagos" : "Pendentes"}
          </button>
        ))}
      </div>

      {/* Users list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Participante</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                E-mail
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Dados Bancários</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum participante encontrado
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <>
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.paid
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {user.paid ? "✓ Pago" : "⏳ Pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.bankDetails ? (
                        <button
                          onClick={() =>
                            setExpandedUser(expandedUser === user.id ? null : user.id)
                          }
                          className="text-xs text-[#009C3B] hover:text-[#006B2B] underline"
                        >
                          {expandedUser === user.id ? "Ocultar" : "Ver dados"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Não preenchido</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePayment(user.id, user.paid)}
                        disabled={toggling === user.id}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                          user.paid
                            ? "border border-red-200 text-red-600 hover:bg-red-50"
                            : "bg-[#009C3B] text-white hover:bg-[#006B2B]"
                        } disabled:opacity-50`}
                      >
                        {toggling === user.id
                          ? "..."
                          : user.paid
                            ? "Desfazer"
                            : "Marcar Pago"}
                      </button>
                    </td>
                  </tr>
                  {expandedUser === user.id && user.bankDetails && (
                    <tr key={`${user.id}-details`} className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs">Nome Completo</p>
                            <p className="font-medium">{user.bankDetails.fullName}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">CPF</p>
                            <p className="font-medium">{user.bankDetails.cpf}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Banco</p>
                            <p className="font-medium">{user.bankDetails.bank}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Agência</p>
                            <p className="font-medium">{user.bankDetails.agency}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Conta Corrente</p>
                            <p className="font-medium">{user.bankDetails.account}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">PIX</p>
                            <p className="font-medium">{user.bankDetails.pix}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
