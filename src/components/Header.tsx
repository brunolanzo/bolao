"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Bolão Copa 2026
        </Link>

        {session ? (
          <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/palpites/grupos" className="hover:text-gray-600 transition-colors">
                Palpites
              </Link>
              <Link href="/palpites/classificacao" className="hover:text-gray-600 transition-colors">
                Classificação
              </Link>
              <Link href="/ranking" className="hover:text-gray-600 transition-colors">
                Ranking
              </Link>
              {session.user.role === "admin" && (
                <Link href="/admin" className="hover:text-gray-600 transition-colors">
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
                <span className="text-gray-500">{session.user.name}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-gray-400 hover:text-black transition-colors"
                >
                  Sair
                </button>
              </div>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2"
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
            <Link href="/login" className="hover:text-gray-600 transition-colors">
              Entrar
            </Link>
            <Link
              href="/registro"
              className="bg-black text-white px-4 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              Cadastrar
            </Link>
          </nav>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && session && (
        <nav className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-3 text-sm">
            <Link href="/palpites/grupos" className="block hover:text-gray-600" onClick={() => setMenuOpen(false)}>
              Palpites
            </Link>
            <Link href="/palpites/classificacao" className="block hover:text-gray-600" onClick={() => setMenuOpen(false)}>
              Classificação
            </Link>
            <Link href="/ranking" className="block hover:text-gray-600" onClick={() => setMenuOpen(false)}>
              Ranking
            </Link>
            {session.user.role === "admin" && (
              <Link href="/admin" className="block hover:text-gray-600" onClick={() => setMenuOpen(false)}>
                Admin
              </Link>
            )}
            <div className="pt-3 border-t border-gray-200">
              <span className="text-gray-500 block mb-2">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-400 hover:text-black transition-colors"
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
