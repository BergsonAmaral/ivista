import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout, ensureProfile } from "@/lib/actions";
import { NavLinks } from "@/components/NavLinks";

const NAV = [
  { href: "/", label: "Painel" },
  { href: "/agendamentos", label: "Agendamentos" },
  { href: "/rotas", label: "Rotas" },
  { href: "/vistorias", label: "Vistorias" },
  { href: "/conferencia", label: "Conferência" },
  { href: "/entregas", label: "Entregas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/equipe", label: "Equipe", adminOnly: true },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  atendente: "Atendente",
  vistoriador: "Vistoriador",
  digitadora: "Digitadora",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await ensureProfile() : null;

  const iniciais = (profile?.nome ?? user?.email ?? "?")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-slate-900 text-white shadow-md shadow-slate-900/10">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-5 h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-sm shadow-lg shadow-indigo-900/40">
              AI
            </span>
            <span className="font-bold tracking-tight leading-tight hidden sm:block">
              Super Visão
              <span className="block text-[10px] font-medium text-slate-400 tracking-wide uppercase">
                Fortaleza · Vistorias
              </span>
            </span>
          </Link>
          <NavLinks
            items={NAV.filter((n) => !n.adminOnly || profile?.role === "admin")}
          />
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden md:block text-right leading-tight">
              <div className="text-sm font-medium">{profile?.nome ?? user?.email}</div>
              <div className="text-[11px] text-slate-400">
                {ROLE_LABEL[profile?.role ?? ""] ?? ""}
              </div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold">
              {iniciais}
            </span>
            <form action={logout}>
              <button className="text-xs text-slate-400 hover:text-white transition-colors">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
