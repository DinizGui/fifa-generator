"use client";

import { LayoutGrid, MapPin, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type GeneratedCareer = {
  id: number;
  name: string;
  budget: number;
  difficulty: string;
  season: number;
  mainObjective: string;
  tacticalStyle?: string | null;
  formation?: string | null;
  challengeType?: { name: string } | null;
  team: { name: string; league: string | null };
  objectives: Array<{ id: number; description: string }>;
  restrictions: Array<{ id: number; description: string }>;
  narrative?: { text: string } | null;
  tactic?: { formation: string; style: string; width: number; depth: number } | null;
};

export function CareerSummaryCard({ career }: { career: GeneratedCareer }) {
  return (
    <Card className="overflow-hidden border-white/10 bg-card/80 shadow-[0_20px_50px_-20px_oklch(0_0_0_/_0.5)]">
      <div className="h-1 w-full bg-gradient-to-r from-[var(--fifa-accent)] via-[var(--fifa-accent-dim)] to-transparent" />
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-heading text-2xl text-white">{career.name}</CardTitle>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 text-[var(--fifa-accent)]" />
              {career.team.name}
              {career.team.league ? ` · ${career.team.league}` : ""}
            </p>
          </div>
          <Badge className="w-fit border-[var(--fifa-accent)]/40 bg-[var(--fifa-accent)]/15 text-[var(--fifa-accent)]">
            {career.challengeType?.name ?? "Desafio livre"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Temporada</div>
            <div className="font-heading text-lg tabular-nums text-white">{career.season}</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Dificuldade</div>
            <div className="font-heading text-lg capitalize text-white">{career.difficulty}</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 sm:col-span-2 lg:col-span-2">
            <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Orçamento</div>
            <div className="font-heading text-lg text-[var(--fifa-accent)] tabular-nums sm:text-xl">
              € {career.budget.toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-6 text-sm">
        <div>
          <div className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold tracking-wide text-white uppercase">
            <Target className="size-4 text-[var(--fifa-accent)]" />
            Objetivo principal
          </div>
          <p className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-muted-foreground">
            {career.mainObjective}
          </p>
        </div>

        <div>
          <p className="mb-2 font-heading text-sm font-semibold tracking-wide text-white uppercase">Narrativa</p>
          <p className="leading-relaxed text-muted-foreground">{career.narrative?.text}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 font-heading text-sm font-semibold tracking-wide text-white uppercase">Metas</p>
            <ul className="space-y-2">
              {career.objectives.map((o) => (
                <li
                  key={o.id}
                  className="flex gap-2 rounded-lg border border-white/5 bg-black/15 px-3 py-2 text-muted-foreground"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--fifa-accent)]" />
                  {o.description}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-heading text-sm font-semibold tracking-wide text-white uppercase">Restrições</p>
            <ul className="space-y-2">
              {career.restrictions.map((r) => (
                <li
                  key={r.id}
                  className="border-l-2 border-[var(--fifa-accent)]/40 py-0.5 pl-3 text-muted-foreground"
                >
                  {r.description}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-white">
            <LayoutGrid className="size-4 text-[var(--fifa-accent)]" />
            Tática sugerida
          </div>
          <p className="text-muted-foreground">
            <span className="font-heading text-lg text-[var(--fifa-accent)]">
              {career.tactic?.formation ?? career.formation}
            </span>
            <span className="mx-2 text-white/30">|</span>
            <span className="capitalize">{career.tactic?.style ?? career.tacticalStyle}</span>
            <span className="mx-2 text-white/30">|</span>
            largura <span className="tabular-nums text-foreground">{career.tactic?.width}</span>
            <span className="mx-1 text-white/30">·</span>
            profundidade <span className="tabular-nums text-foreground">{career.tactic?.depth}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
