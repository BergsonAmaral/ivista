import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Super Visão Fortaleza — Gestão de Vistorias",
  description: "Sistema operacional de vistorias automotivas",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-zinc-50 text-zinc-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
