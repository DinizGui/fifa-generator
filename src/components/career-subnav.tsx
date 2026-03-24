"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, LineChart, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = (careerId: number) =>
  [
    { href: `/career/${careerId}`, label: "Visão geral", icon: LayoutGrid },
    { href: `/career/${careerId}/squad`, label: "Elenco", icon: Users },
    { href: `/career/${careerId}/transfers`, label: "Transferências", icon: LineChart },
    { href: `/career/${careerId}/tactics`, label: "Táticas", icon: Shield },
  ] as const;

export function CareerSubnav({
  careerId,
  careerName,
}: {
  careerId: number;
  careerName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
        <Link href="/dashboard" className="hover:text-[var(--fifa-accent)]">
          Carreiras
        </Link>
        <ChevronRight className="size-3.5 shrink-0 opacity-50" />
        <span className="truncate font-medium text-foreground">{careerName}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/5 bg-black/20 p-1 backdrop-blur-sm">
        {tabs(careerId).map(({ href, label, icon: Icon }) => {
          const overview = `/career/${careerId}`;
          const active =
            href === overview
              ? pathname === overview
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm",
                active
                  ? "bg-[var(--fifa-accent)] text-[oklch(0.15_0.02_260)] shadow-[0_0_16px_oklch(0.72_0.19_145_/_0.25)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
