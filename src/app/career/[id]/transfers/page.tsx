import { notFound, redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CareerSubnav } from "@/components/career-subnav";
import { PageHeader } from "@/components/page-header";
import { getSessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TransfersPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");
  const { id } = await params;

  const career = await prisma.career.findFirst({
    where: { id: Number(id), userId: session.userId },
  });
  if (!career) notFound();

  const transfers = await prisma.transfer.findMany({
    where: { careerId: career.id },
    include: { player: true, fromTeam: true, toTeam: true },
    orderBy: { date: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <CareerSubnav careerId={career.id} careerName={career.name} />

      <PageHeader
        title="Transferências"
        description="Histórico de contratações e vendas registradas nesta carreira."
      />

      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-lg text-white">
            <ArrowRightLeft className="size-4 text-[var(--fifa-accent)]" />
            Movimentações
          </CardTitle>
          <CardDescription>
            {transfers.length === 0
              ? "Nenhuma transferência ainda. Contrate ou venda pelo elenco."
              : `${transfers.length} registro(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {transfers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Seu mercado aparece aqui após a primeira negociação.
            </p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/5 overflow-hidden">
              {transfers.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 bg-black/10 px-4 py-3 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium text-foreground">{t.player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.fromTeam?.name ?? "Livre"}
                      <span className="mx-1.5 text-[var(--fifa-accent)]">→</span>
                      {t.toTeam?.name ?? "Sem clube"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-[var(--fifa-accent)] tabular-nums">
                      € {t.value.toLocaleString("pt-BR")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
