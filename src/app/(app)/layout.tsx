import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout, ensureProfile } from "@/lib/actions";
import { SideNav, BottomNav, type NavItem } from "@/components/NavLinks";
import { LogOut } from "lucide-react";

// Cada função vê apenas as telas que usa — menos abas, menos confusão
const NAV: (NavItem & { roles: string[] })[] = [
  { href: "/agendamentos", label: "Agendamentos", icon: "agenda", section: "Operação", roles: ["admin", "atendente", "digitadora"] },
  { href: "/rotas", label: "Rotas", icon: "rotas", section: "Operação", roles: ["admin", "atendente", "digitadora"] },
  { href: "/minha-rota", label: "Minha rota", icon: "rotas", roles: ["vistoriador"] },
  { href: "/clientes", label: "Empresas", icon: "clientes", section: "Cadastros", roles: ["admin", "atendente"] },
  { href: "/equipe", label: "Vistoriadores", icon: "equipe", section: "Cadastros", roles: ["admin"] },
  { href: "/portal", label: "Portal", icon: "portal", roles: ["cliente"] },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  atendente: "Atendente",
  vistoriador: "Vistoriador",
  digitadora: "Digitadora",
  cliente: "Cliente",
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

  const itens = NAV.filter((n) => n.roles.includes(profile?.role ?? "atendente")).map(
    ({ href, label, icon, section }) => ({ href, label, icon, section })
  );

  const iniciais = (profile?.nome ?? user?.email ?? "?")
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-slate-900 text-white p-4">
        <Link href="/" className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-700 font-black text-sm shadow-lg shadow-red-950/40">
            AI
          </span>
          <span className="font-bold tracking-tight leading-tight">
            Super Visão
            <span className="block text-[10px] font-medium text-slate-400 tracking-wide uppercase">
              Fortaleza · Vistorias
            </span>
          </span>
        </Link>

        <SideNav items={itens} />

        <div className="mt-auto border-t border-white/10 pt-4 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold">
            {iniciais}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-medium truncate">{profile?.nome ?? user?.email}</div>
            <div className="text-[11px] text-slate-400">
              {ROLE_LABEL[profile?.role ?? ""] ?? ""}
            </div>
          </div>
          <form action={logout}>
            <button
              title="Sair"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Topo (mobile) ===== */}
      <header className="lg:hidden sticky top-0 z-20 bg-slate-900 text-white">
        <div className="flex items-center gap-3 h-14 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-700 font-black text-xs">
              AI
            </span>
            <span className="font-bold text-sm">Super Visão</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">{profile?.nome?.split(" ")[0]}</span>
            <form action={logout}>
              <button className="text-xs text-slate-400 hover:text-white">Sair</button>
            </form>
          </div>
        </div>
      </header>

      {/* ===== Conteúdo ===== */}
      <main className="lg:pl-64">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8 pb-24 lg:pb-8">{children}</div>
      </main>

      {/* ===== Menu inferior (mobile) ===== */}
      <BottomNav items={itens} />
    </div>
  );
}
