import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { SquadManager } from "@/components/squad-manager";
import { CareerSubnav } from "@/components/career-subnav";
import { PageHeader } from "@/components/page-header";
import { getSessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionPayload();
  if (!session) redirect("/login");
  const { id } = await params;
  const careerId = Number(id);

  const career = await prisma.career.findFirst({
    where: { id: careerId, userId: session.userId },
    select: { id: true, name: true, team: { select: { name: true } } },
  });
  if (!career) notFound();

  const squad = await prisma.careerPlayer.findMany({
    where: { careerId },
    include: { player: true },
    orderBy: [{ isTitular: "desc" }, { overallAtual: "desc" }],
  });

  const avg =
    squad.length > 0
      ? Math.round(squad.reduce((s, p) => s + p.overallAtual, 0) / squad.length)
      : 0;
  const starters = squad.filter((p) => p.isTitular).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <CareerSubnav careerId={career.id} careerName={career.name} />

      <PageHeader
        title="Elenco"
        description={`${career.team.name} — ajuste overall e titulares conforme evolui no FIFA. Contratações alteram apenas esta carreira.`}
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-card/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Jogadores</div>
          <div className="font-heading flex items-baseline gap-2 text-2xl text-white tabular-nums">
            {squad.length}
            <Users className="size-4 text-[var(--fifa-accent)] opacity-80" />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Titulares</div>
          <div className="font-heading text-2xl text-[var(--fifa-accent)] tabular-nums">{starters}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/60 px-4 py-3 backdrop-blur-sm">
          <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Média OVR (save)</div>
          <div className="font-heading text-2xl text-white tabular-nums">{avg || "—"}</div>
        </div>
      </div>

      <SquadManager careerId={careerId} initialSquad={squad} />
    </main>
  );
}
