import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, Target, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CareerSubnav } from "@/components/career-subnav";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getSessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function CareerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");
  const { id } = await params;

  const career = await prisma.career.findFirst({
    where: { id: Number(id), userId: session.userId },
    include: {
      team: true,
      challengeType: true,
      narrative: true,
      objectives: true,
      restrictions: true,
      tactic: true,
    },
  });

  if (!career) notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <CareerSubnav careerId={career.id} careerName={career.name} />

      <PageHeader title={career.name} description={career.mainObjective}>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-[var(--fifa-accent)]/40 bg-[var(--fifa-accent)]/15 text-[var(--fifa-accent)]">
            {career.challengeType?.name ?? "Carreira manual"}
          </Badge>
          <Badge variant="outline" className="border-white/15 capitalize">
            {career.difficulty}
          </Badge>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-card/70 lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg text-white">
              <BookOpen className="size-4 text-[var(--fifa-accent)]" />
              História do save
            </CardTitle>
            <CardDescription>Narrativa gerada para contextualizar sua temporada.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {career.narrative?.text ?? "Sem narrativa para esta carreira."}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading flex items-center gap-2 text-base text-white">
                <Wallet className="size-4 text-[var(--fifa-accent)]" />
                Clube e finanças
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Clube inicial</div>
                <div className="font-medium text-foreground">{career.team.name}</div>
                <div className="text-muted-foreground">{career.team.league ?? "Liga não informada"}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/25 px-3 py-2">
                <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Orçamento
                </div>
                <div className="font-heading text-lg text-[var(--fifa-accent)] tabular-nums">
                  € {career.budget.toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Temporada {career.season}</div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/70">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base text-white">Tática sugerida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Formação</span>
                <span className="font-medium tabular-nums">
                  {career.tactic?.formation ?? career.formation ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Estilo</span>
                <span className="font-medium capitalize">
                  {career.tactic?.style ?? career.tacticalStyle ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-card/70">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-lg text-white">
              <Target className="size-4 text-[var(--fifa-accent)]" />
              Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {career.objectives.map((o) => (
                <li
                  key={o.id}
                  className="flex gap-3 rounded-lg border border-white/5 bg-black/15 px-3 py-2 text-sm"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--fifa-accent)]" />
                  <span className="text-muted-foreground">{o.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/70">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-white">Restrições da carreira</CardTitle>
            <CardDescription>Regras opcionais para manter o save desafiador.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {career.restrictions.map((r) => (
                <li
                  key={r.id}
                  className="border-l-2 border-[var(--fifa-accent)]/50 py-1 pl-3 text-sm text-muted-foreground"
                >
                  {r.description}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/career/${career.id}/squad`} className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
          Ir para o elenco
        </Link>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "border-white/15 bg-transparent")}
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
