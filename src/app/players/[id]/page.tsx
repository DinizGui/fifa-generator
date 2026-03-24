import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Shirt, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n.toLocaleString("pt-BR")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num)) return { title: "Jogador" };
  const p = await prisma.player.findUnique({
    where: { id: num },
    select: { name: true },
  });
  return { title: p ? `${p.name} · FIFA 23` : "Jogador" };
}

export default async function PlayerDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const num = Number(id);
  if (!Number.isFinite(num) || num < 1) notFound();

  const player = await prisma.player.findUnique({
    where: { id: num },
    include: {
      team: true,
    },
  });

  if (!player) notFound();

  const growth = player.potential - player.overall;
  const img = player.imageUrl;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link
          href="/players"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-4 gap-2 text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeft className="size-4" />
          Base de jogadores
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Card className="overflow-hidden border-white/10 bg-card/70">
          <div className="relative aspect-[3/4] w-full bg-black/40">
            {img ? (
              <Image
                src={img}
                alt={player.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 280px"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-muted-foreground">
                Sem foto na base
              </div>
            )}
          </div>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-heading text-[var(--fifa-accent)]">
                OVR {player.overall}
              </Badge>
              <Badge variant="outline" className="border-white/15">
                POT {player.potential}
              </Badge>
              {growth !== 0 ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    growth > 0 && "border-[var(--fifa-accent)]/30 bg-[var(--fifa-accent)]/10",
                  )}
                >
                  <TrendingUp className="mr-1 size-3" />
                  {growth > 0 ? `+${growth}` : growth} evolução
                </Badge>
              ) : null}
            </div>
            <CardTitle className="font-heading text-2xl text-white sm:text-3xl">{player.name}</CardTitle>
            <CardDescription className="text-base">{player.nationality}</CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/10 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg text-white">
                <Shirt className="size-5 text-[var(--fifa-accent)]" />
                Clube
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-lg font-medium text-foreground">{player.team.name}</p>
              {player.team.league ? (
                <p className="text-muted-foreground">{player.team.league}</p>
              ) : null}
              <p className="text-muted-foreground">{player.team.country}</p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-card/60">
            <CardHeader>
              <CardTitle className="font-heading text-lg text-white">Dados da carreira (dataset)</CardTitle>
              <CardDescription>
                Posição principal, idade e atributos financeiros importados do FIFA 23.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Posição" value={player.position} />
                <Stat label="Idade" value={`${player.age} anos`} />
                {player.heightCm != null ? (
                  <Stat label="Altura" value={`${player.heightCm} cm`} />
                ) : null}
                {player.weightKg != null ? (
                  <Stat label="Peso" value={`${player.weightKg} kg`} />
                ) : null}
                <Stat label="Valor" value={formatEuro(player.value)} accent />
                <Stat label="Salário / sem." value={formatEuro(player.wage)} />
              </dl>
            </CardContent>
          </Card>

          {img ? (
            <p className="text-xs text-muted-foreground">
              Imagem: Sofifa CDN.{" "}
              <a
                href={img}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--fifa-accent)] hover:underline"
              >
                Abrir URL
                <ExternalLink className="size-3" />
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem URL de imagem — volta a correr o import após atualizar a base com o campo{" "}
              <code className="rounded bg-white/5 px-1">imageUrl</code>.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-medium tabular-nums text-foreground",
          accent && "text-[var(--fifa-accent)]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
