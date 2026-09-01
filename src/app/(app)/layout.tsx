import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions";

const NAV = [
  { href: "/", label: "Painel" },
  { href: "/agendamentos", label: "Agendamentos" },
  { href: "/rotas", label: "Rotas" },
  { href: "/vistorias", label: "Vistorias" },
  { href: "/conferencia", label: "Conferência" },
  { href: "/entregas", label: "Entregas" },
  { href: "/clientes", label: "Clientes" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("nome, role").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-4 h-14">
          <Link href="/" className="font-bold tracking-tight">
            VISTA
          </Link>
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg hover:bg-zinc-100 whitespace-nowrap"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-zinc-500 hidden sm:block">
              {profile?.nome ?? user?.email}
              {profile?.role ? ` · ${profile.role}` : ""}
            </span>
            <form action={logout}>
              <button className="text-zinc-500 hover:text-zinc-900">Sair</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
