"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paymentPaid, setPaymentPaid] = useState<boolean | null>(null);

  useEffect(() => {
    if (session) {
      fetch("/api/payment")
        .then((res) => res.json())
        .then((data) => setPaymentPaid(data.paid ?? false))
        .catch(() => setPaymentPaid(false));
    }
  }, [session]);

  return (
    <header className="border-b border-green-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-[#006B2B]">
          Bolão Copa 2026
        </Link>

        {session ? (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/palpites/grupos" className="hover:text-[#009C3B] transition-colors">
                Palpites
              </Link>
              <Link href="/palpites/classificacao" className="hover:text-[#009C3B] transition-colors">
                Classificação
              </Link>
              <Link href="/ranking" className="hover:text-[#009C3B] transition-colors">
                Ranking
              </Link>
              <Link href="/regulamento" className="hover:text-[#009C3B] transition-colors">
                Regulamento
              </Link>
              <Link href="/pagamento" className="hover:text-[#009C3B] transition-colors flex items-center gap-1.5">
                Pagamento
                {paymentPaid !== null && (
                  <span
                    className={`w-2 h-2 rounded-full ${paymentPaid ? "bg-[#009C3B]" : "bg-red-500 animate-pulse-slow"}`}
                    title={paymentPaid ? "Pago" : "Pendente"}
                  />
                )}
              </Link>
              {session.user.role === "admin" && (
                <Link href="/admin" className="hover:text-[#009C3B] transition-colors">
                  Admin
                </Link>
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
            <Link
              href="/registro"
              className="bg-[#009C3B] text-white px-4 py-1.5 rounded-md hover:bg-[#006B2B] transition-colors"
            >
              Cadastrar
            </Link>
          </nav>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && session && (
        <nav className="md:hidden border-t border-green-200 bg-white">
          <div className="px-4 py-3 space-y-3 text-sm">
            <Link href="/palpites/grupos" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Palpites
            </Link>
            <Link href="/palpites/classificacao" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Classificação
            </Link>
            <Link href="/ranking" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Ranking
            </Link>
            <Link href="/regulamento" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Regulamento
            </Link>
            <Link href="/pagamento" className="flex items-center gap-1.5 hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
              Pagamento
              {paymentPaid !== null && (
                <span
                  className={`w-2 h-2 rounded-full ${paymentPaid ? "bg-[#009C3B]" : "bg-red-500 animate-pulse-slow"}`}
                  title={paymentPaid ? "Pago" : "Pendente"}
                />
              )}
            </Link>
            {session.user.role === "admin" && (
              <Link href="/admin" className="block hover:text-[#009C3B]" onClick={() => setMenuOpen(false)}>
                Admin
              </Link>
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
