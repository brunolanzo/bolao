"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [palpitesOpen, setPalpitesOpen] = useState(false);
  const [paymentPaid, setPaymentPaid] = useState<boolean | null>(null);
  const [regClosed, setRegClosed] = useState(false);
  const palpitesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session && session.user.role !== "admin") {
      fetch("/api/payment")
        .then((res) => res.json())
        .then((data) => setPaymentPaid(data.paid ?? false))
        .catch(() => setPaymentPaid(false));
    }
  }, [session]);

  // For logged-out visitors: hide "Cadastrar" once registration closes.
  useEffect(() => {
    if (!session) {
      fetch("/api/registration-status")
        .then((res) => res.json())
        .then((data) => setRegClosed(!!data.closed))
        .catch(() => setRegClosed(false));
    }
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (palpitesRef.current && !palpitesRef.current.contains(e.target as Node)) {
        setPalpitesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="border-b border-green-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href={session ? (session.user.role === "admin" ? "/admin/resultados" : "/dashboard") : "/"}
          className="text-lg font-bold tracking-tight text-[#006B2B]"
        >
          Nosso Bolão 2026
        </Link>

        {session ? (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              {session.user.role !== "admin" && (
                <>
                  <Link href="/dashboard" className="hover:text-[#009C3B] transition-colors">
                    Início
                  </Link>

                  {/* Palpites dropdown */}
                  <div ref={palpitesRef} className="relative">
                    <button
                      onClick={() => setPalpitesOpen((o) => !o)}
                      className="flex items-center gap-1 hover:text-[#009C3B] transition-colors"
                    >
                      Palpites
                      <svg
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${palpitesOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {palpitesOpen && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 min-w-[210px]">
                        {/* small caret */}
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
                        <Link
                          href="/palpites/grupos"
                          onClick={() => setPalpitesOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-green-50 hover:text-[#006B2B] transition-colors"
                        >
                          <span className="text-base">⚽</span>
                          Fase de Grupos
                        </Link>
                        <Link
                          href="/palpites/classificacao"
                          onClick={() => setPalpitesOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-green-50 hover:text-[#006B2B] transition-colors"
                        >
                          <span className="text-base">🏆</span>
                          Chaveamento e Campeão
                        </Link>
                        <Link
                          href="/palpites/eliminatorias"
                          onClick={() => setPalpitesOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-green-50 hover:text-[#006B2B] transition-colors"
                        >
                          <span className="text-base">⚡</span>
                          Eliminatórias
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Link href="/ranking" className="hover:text-[#009C3B] transition-colors">
                Ranking
              </Link>
              <Link href="/regulamento" className="hover:text-[#009C3B] transition-colors">
                Regulamento
              </Link>
              {session.user.role !== "admin" && (
                <Link href="/pagamento" className="hover:text-[#009C3B] transition-colors flex items-center gap-1.5">
                  Pagamento
                  {paymentPaid !== null && (
                    <span
                      className={`w-2 h-2 rounded-full ${paymentPaid ? "bg-[#009C3B]" : "bg-red-500 animate-pulse-slow"}`}
                      title={paymentPaid ? "Pago" : "Pendente"}
                    />
                  )}
                </Link>
              )}
              {session.user.role === "admin" && (
                <>
                  <Link href="/admin/resultados" className="hover:text-[#009C3B] transition-colors">
                    Atualizar
                  </Link>
                  <Link href="/admin/estatisticas" className="hover:text-[#009C3B] transition-colors">
                    Estatísticas
                  </Link>
                  <Link href="/admin" className="hover:text-[#009C3B] transition-colors">
                    Admin
                  </Link>
                </>
              )}
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-green-200">
                <span className="text-gray-500">{session.user.name}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-[#009C3B] hover:text-[#006B2B] transition-colors"
                >
                  Sair
                </button>
              </div>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-[#009C3B]"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:text-[#009C3B] transition-colors">
              Entrar
            </Link>
            {!regClosed && (
              <Link
                href="/registro"
                className="bg-[#009C3B] text-white px-4 py-1.5 rounded-md hover:bg-[#006B2B] transition-colors"
              >
                Cadastrar
              </Link>
            )}
          </nav>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && session && (
        <nav className="md:hidden border-t border-green-200 bg-white">
          <div className="px-4 py-3 space-y-3 text-sm">
            {session.user.role !== "admin" && (
              <>
                <Link href="/dashboard" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                  Início
                </Link>
                {/* Palpites section */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Palpites
                  </p>
                  <div className="space-y-2 pl-2 border-l-2 border-green-100">
                    <Link href="/palpites/grupos" className="flex items-center gap-2 hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                      <span>⚽</span> Fase de Grupos
                    </Link>
                    <Link href="/palpites/classificacao" className="flex items-center gap-2 hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                      <span>🏆</span> Chaveamento e Campeão
                    </Link>
                    <Link href="/palpites/eliminatorias" className="flex items-center gap-2 hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                      <span>⚡</span> Eliminatórias
                    </Link>
                  </div>
                </div>
              </>
            )}
            <Link href="/ranking" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Ranking
            </Link>
            <Link href="/regulamento" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Regulamento
            </Link>
            {session.user.role !== "admin" && (
              <Link href="/pagamento" className="flex items-center gap-1.5 hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                Pagamento
                {paymentPaid !== null && (
                  <span
                    className={`w-2 h-2 rounded-full ${paymentPaid ? "bg-[#009C3B]" : "bg-red-500 animate-pulse-slow"}`}
                    title={paymentPaid ? "Pago" : "Pendente"}
                  />
                )}
              </Link>
            )}
            {session.user.role === "admin" && (
              <>
                <Link href="/admin/resultados" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                  Atualizar
                </Link>
                <Link href="/admin/estatisticas" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                  Estatísticas
                </Link>
                <Link href="/admin" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                  Admin
                </Link>
              </>
            )}
            <div className="pt-3 border-t border-green-200">
              <span className="text-gray-500 block mb-2">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[#009C3B] hover:text-[#006B2B] transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
