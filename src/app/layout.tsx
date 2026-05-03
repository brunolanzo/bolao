import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Header from "@/components/Header";
import PrizeBanner from "@/components/PrizeBanner";
import PageViewTracker from "@/components/PageViewTracker";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nosso Bolão 2026",
  description: "Bolão fechado da Copa do Mundo FIFA 2026 — só para amigos indicados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-white text-black`}>
        <SessionProvider>
          <PageViewTracker />
          <Header />
          <PrizeBanner />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
