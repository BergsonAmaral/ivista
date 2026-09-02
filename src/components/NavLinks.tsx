"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Map,
  Camera,
  ClipboardCheck,
  Send,
  Building2,
  Users,
  Car,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: string; section?: string };

const ICONS: Record<string, LucideIcon> = {
  painel: LayoutDashboard,
  agenda: CalendarDays,
  rotas: Map,
  vistorias: Camera,
  conferencia: ClipboardCheck,
  entregas: Send,
  clientes: Building2,
  equipe: Users,
  portal: Car,
};

function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? LayoutDashboard;
  return <C className={className} strokeWidth={2} />;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Menu lateral (desktop) — agrupado por seção
export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const secoes: { nome: string | undefined; itens: NavItem[] }[] = [];
  for (const n of items) {
    const ultima = secoes[secoes.length - 1];
    if (ultima && ultima.nome === n.section) ultima.itens.push(n);
    else secoes.push({ nome: n.section, itens: [n] });
  }
  return (
    <nav className="flex flex-col gap-1">
      {secoes.map((sec, i) => (
        <div key={sec.nome ?? i} className={i > 0 ? "mt-4" : ""}>
          {sec.nome && (
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {sec.nome}
            </div>
          )}
          <div className="flex flex-col gap-1">
            {sec.itens.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon
                    name={n.icon}
                    className={`h-[18px] w-[18px] ${active ? "text-red-400" : ""}`}
                  />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// Menu inferior (mobile) — no máximo 5 itens visíveis
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const visiveis = items.slice(0, 5);
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-slate-900 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {visiveis.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                active ? "text-white" : "text-slate-400"
              }`}
            >
              <Icon
                name={n.icon}
                className={`h-5 w-5 ${active ? "text-red-400" : "opacity-70"}`}
              />
              {n.label}
              <span
                className={`h-0.5 w-6 rounded-full ${active ? "bg-red-500" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
