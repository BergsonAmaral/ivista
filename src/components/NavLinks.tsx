"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Menu lateral (desktop)
export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((n) => {
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
            <span className="text-lg leading-none">{n.icon}</span>
            {n.label}
          </Link>
        );
      })}
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
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
                active ? "text-white" : "text-slate-400"
              }`}
            >
              <span className={`text-xl leading-none ${active ? "" : "opacity-70"}`}>
                {n.icon}
              </span>
              {n.label}
              <span
                className={`mt-0.5 h-0.5 w-6 rounded-full ${active ? "bg-red-500" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
