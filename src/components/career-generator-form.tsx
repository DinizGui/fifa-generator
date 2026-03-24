"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CareerSummaryCard } from "@/components/career-summary-card";

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

const difficulties = [
  {
    value: "easy",
    label: "Fácil",
    hint: "Sorteio só entre os ~28% melhores elencos; gigantes e topo global têm peso bem maior.",
  },
  { value: "medium", label: "Médio", hint: "Sorteio mais equilibrado entre todos os times." },
  { value: "hard", label: "Difícil", hint: "Mais chance de clubes com elenco mais fraco." },
  { value: "legendary", label: "Lendário", hint: "Forte viés para times menores; desafio máximo." },
];

export function CareerGeneratorForm() {
  const router = useRouter();
  const [name, setName] = useState("Minha carreira FIFA 23");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCareer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const diffHint = difficulties.find((d) => d.value === difficulty)?.hint ?? "";

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/careers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar carreira");
      setGenerated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar carreira");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden border-white/10 bg-card/70 shadow-[0_0_0_1px_oklch(1_0_0_/_5%)]">
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[var(--fifa-accent)]/50 to-transparent" />
        <CardHeader>
          <CardTitle className="font-heading text-xl text-white sm:text-2xl">Gerador aleatório</CardTitle>
          <CardDescription>
            O clube e o tipo de desafio são sorteados automaticamente entre todos os times do seu banco (dataset
            importado). A dificuldade só influencia a chance de cair em um grande clube ou em um time mais modesto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="gen-name" className="text-muted-foreground">
              Nome da carreira
            </Label>
            <Input
              id="gen-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-white/10 bg-black/20"
              placeholder="Ex.: Meu RTG épico"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground">Dificuldade</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "medium")}>
              <SelectTrigger className="border-white/10 bg-black/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {diffHint ? (
              <p className="flex gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-[var(--fifa-accent)]" />
                {diffHint}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            size="lg"
            disabled={loading}
            onClick={onGenerate}
            className="font-heading w-full gap-2 tracking-wide uppercase sm:w-auto sm:min-w-[240px]"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {loading ? "Sorteando clube e desafio..." : "Gerar carreira"}
          </Button>
        </CardContent>
      </Card>

      {generated ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--fifa-accent)]">
            <span className="size-1.5 rounded-full bg-[var(--fifa-accent)] shadow-[0_0_10px_var(--fifa-glow)]" />
            Time: {generated.team.name}
            {generated.team.league ? ` · ${generated.team.league}` : ""}
          </div>
          <CareerSummaryCard career={generated} />
          <Button
            size="lg"
            className="w-full gap-2 font-heading tracking-wide uppercase sm:w-auto"
            onClick={() => router.push(`/career/${generated.id}`)}
          >
            Começar carreira
          </Button>
        </div>
      ) : null}
    </div>
  );
}
