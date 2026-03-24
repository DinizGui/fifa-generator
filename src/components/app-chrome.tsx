import Link from "next/link";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { getSessionPayload } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

export async function AppChrome({ children }: { children: React.ReactNode }) {
  const session = await getSessionPayload();

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-white/5",
          "bg-[oklch(0.14_0.02_260_/_0.85)] backdrop-blur-xl supports-[backdrop-filter]:bg-[oklch(0.14_0.02_260_/_0.65)]",
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={session ? "/dashboard" : "/login"}
            className="group flex items-center gap-3"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--fifa-accent)] text-[oklch(0.15_0.02_260)] shadow-[0_0_20px_oklch(0.72_0.19_145_/_0.35)]"
              aria-hidden
            >
              <span className="font-heading text-lg font-bold leading-none">
                23
              </span>
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-sm font-semibold tracking-wide text-white uppercase sm:text-base">
                Career Manager
              </span>
              <span className="text-[10px] font-medium tracking-[0.2em] text-[var(--fifa-accent)] uppercase sm:text-xs">
                FIFA 23
              </span>
            </div>
          </Link>

          {session ? (
            <nav className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
              <span className="mr-auto hidden max-w-[140px] truncate text-xs text-muted-foreground sm:block md:max-w-[220px]">
                {session.name}
              </span>
              <ButtonStrip
                href="/dashboard"
                icon={<LayoutDashboard className="size-3.5" />}
                label="Carreiras"
              />
              <ButtonStrip
                href="/career/generate"
                icon={<Sparkles className="size-3.5" />}
                label="Gerar"
                highlight
              />
              <LogoutButton />
            </nav>
          ) : (
            <nav className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 sm:text-sm"
              >
                Entrar
              </Link>
            </nav>
          )}
        </div>
      </header>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

function ButtonStrip({
  href,
  icon,
  label,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm",
        highlight
          ? "bg-[var(--fifa-accent)]/15 text-[var(--fifa-accent)] ring-1 ring-[var(--fifa-accent)]/30 hover:bg-[var(--fifa-accent)]/25"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
