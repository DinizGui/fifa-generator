import { notFound, redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CareerSubnav } from "@/components/career-subnav";
import { PageHeader } from "@/components/page-header";
import { getSessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TacticsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");
  const { id } = await params;

  const career = await prisma.career.findFirst({
    where: { id: Number(id), userId: session.userId },
    include: { tactic: true },
  });
  if (!career) notFound();

  const formation = career.tactic?.formation ?? career.formation ?? "—";
  const style = career.tactic?.style ?? career.tacticalStyle ?? "—";
  const width = career.tactic?.width ?? 50;
  const depth = career.tactic?.depth ?? 50;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <CareerSubnav careerId={career.id} careerName={career.name} />

      <PageHeader
        title="Táticas"
        description="Plano inicial da carreira (formação e estilo). No futuro você poderá editar aqui o mesmo esquema do save."
      />

      <Card className="border-white/10 bg-card/70">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-lg text-white">
            <LayoutGrid className="size-4 text-[var(--fifa-accent)]" />
            Esquema ativo
          </CardTitle>
          <CardDescription>Valores definidos ao criar ou gerar a carreira.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Formação</div>
            <div className="font-heading mt-1 text-3xl text-[var(--fifa-accent)] tabular-nums">{formation}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Estilo</div>
            <div className="mt-1 text-lg font-medium capitalize text-foreground">{style}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4 sm:col-span-2">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Largura</span>
                <div className="font-heading text-xl tabular-nums text-white">{width}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Profundidade</span>
                <div className="font-heading text-xl tabular-nums text-white">{depth}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
