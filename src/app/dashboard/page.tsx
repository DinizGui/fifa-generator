import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Sparkles, Trophy, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSessionPayload();
  if (!session) redirect("/login");

  const careers = await prisma.career.findMany({
    where: { userId: session.userId },
    include: { team: true, challengeType: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Suas carreiras"
        description="Abra um save para mexer no elenco e registrar transferências conforme avança no FIFA."
      >
        <Link
          href="/career/generate"
          className={cn(
            buttonVariants({ size: "lg" }),
            "inline-flex gap-2 font-heading tracking-wide uppercase shadow-[0_0_24px_var(--fifa-glow)]",
          )}
        >
          <Sparkles className="size-4" />
          Nova carreira
        </Link>
      </PageHeader>

      {careers.length === 0 ? (
        <Card className="border-dashed border-white/15 bg-card/50">
          <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--fifa-accent)]/15 ring-1 ring-[var(--fifa-accent)]/25">
              <Trophy className="size-8 text-[var(--fifa-accent)]" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">
                Nenhuma carreira ainda
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Gere um desafio com time, orçamento e metas — o elenco inicial do clube entra automaticamente.
              </p>
            </div>
            <Link
              href="/career/generate"
              className={cn(buttonVariants({ size: "lg" }), "inline-flex gap-2")}
            >
              <Plus className="size-4" />
              Começar agora
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {careers.map((career) => (
            <Card
              key={career.id}
              className="group relative overflow-hidden border-white/10 bg-card/70 transition hover:border-[var(--fifa-accent)]/25 hover:shadow-[0_0_40px_-10px_var(--fifa-glow)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--fifa-accent)]/5 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <CardHeader className="relative space-y-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading text-lg leading-tight text-white sm:text-xl">
                    {career.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="shrink-0 border border-white/10 bg-secondary/80 text-[10px] uppercase tracking-wider"
                  >
                    {career.challengeType?.name ?? "Manual"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 text-sm">
                  {career.team.name}
                  {career.team.league ? ` · ${career.team.league}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      <Wallet className="size-3" />
                      Orçamento
                    </div>
                    <div className="font-heading text-base text-[var(--fifa-accent)] tabular-nums">
                      € {career.budget.toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <div className="mb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      Dificuldade
                    </div>
                    <div className="font-medium capitalize text-foreground">{career.difficulty}</div>
                  </div>
                </div>
                <Link
                  href={`/career/${career.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full gap-2 border-white/10 bg-transparent hover:bg-white/5",
                  )}
                >
                  Abrir carreira
                  <ArrowRight className="size-3.5 opacity-60" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
