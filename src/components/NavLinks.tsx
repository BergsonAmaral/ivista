"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm">
      {items.map((n) => {
        const active =
          n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              active
                ? "bg-white/15 text-white"
                : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
