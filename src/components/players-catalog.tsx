"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TeamBrief = {
  id: number;
  name: string;
  league: string | null;
  country: string;
};

type PlayerRow = {
  id: number;
  name: string;
  imageUrl: string | null;
  age: number;
  position: string;
  overall: number;
  potential: number;
  nationality: string;
  value: number;
  wage: number;
  sofifaId: number | null;
  team: TeamBrief;
};

type TopPotentialRow = {
  id: number;
  name: string;
  overall: number;
  potential: number;
  position: string;
  age: number;
  team: { name: string };
};

type SearchResponse = {
  items: PlayerRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string;
  order: string;
  summary: {
    totalInDb: number;
    maxOverall: number;
    maxPotential: number;
    avgOverall: number | null;
    avgPotential: number | null;
    topByPotential: TopPotentialRow[];
  };
};

function formatEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n}`;
}

export function PlayersCatalog() {
  const [q, setQ] = useState("");
  const [position, setPosition] = useState("");
  const [minOverall, setMinOverall] = useState("0");
  const [minPotential, setMinPotential] = useState("0");
  const [maxAge, setMaxAge] = useState("45");
  const [sort, setSort] = useState("overall");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const filtersRef = useRef({ q, position, minOverall, minPotential, maxAge });
  filtersRef.current = { q, position, minOverall, minPotential, maxAge };

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      setErr(null);
      const f = filtersRef.current;
      const params = new URLSearchParams({
        q: f.q.trim(),
        position: f.position.trim(),
        minOverall: f.minOverall || "0",
        minPotential: f.minPotential || "0",
        maxAge: f.maxAge || "55",
        sort,
        order,
        page: String(p),
        pageSize: "25",
      });
      try {
        const res = await fetch(`/api/players/search?${params}`);
        if (!res.ok) throw new Error("Falha ao carregar jogadores.");
        const json = (await res.json()) as SearchResponse;
        setData(json);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro desconhecido.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [sort, order],
  );

  useEffect(() => {
    void fetchPage(1);
  }, [fetchPage]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchPage(1);
  };

  const curPage = data?.page ?? 1;
  const growth = (o: number, pot: number) => pot - o;

  return (
    <div className="space-y-8">
      {data?.summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Jogadores na base"
            value={data.summary.totalInDb.toLocaleString("pt-BR")}
            hint="Total importado do dataset"
          />
          <StatCard
            label="Maior overall"
            value={String(data.summary.maxOverall)}
            hint="Melhor nota atual no elenco"
          />
          <StatCard
            label="Maior potencial"
            value={String(data.summary.maxPotential)}
            hint="Teto de evolução (FIFA)"
          />
          <StatCard
            label="Médias"
            value={
              data.summary.avgOverall != null && data.summary.avgPotential != null
                ? `OVR ${data.summary.avgOverall} · POT ${data.summary.avgPotential}`
                : "—"
            }
            hint="Média em todos os jogadores"
          />
        </div>
      ) : null}

      {data?.summary?.topByPotential?.length ? (
        <Card className="border-white/10 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg text-white">
              Maior potencial (teto de overall)
            </CardTitle>
            <CardDescription>
              Os que mais podem crescer no simulador — ordenados por <strong>POT</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.summary.topByPotential.map((pl) => (
              <Link key={pl.id} href={`/players/${pl.id}`} className="inline-block">
                <Badge
                  variant="secondary"
                  className="cursor-pointer border border-white/10 bg-black/30 py-1.5 pl-2 pr-3 font-normal hover:bg-white/10"
                >
                  <span className="font-medium text-foreground">{pl.name}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="tabular-nums text-[var(--fifa-accent)]">
                    OVR {pl.overall} → POT {pl.potential}
                  </span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                    (+{growth(pl.overall, pl.potential)})
                  </span>
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-card/60">
        <CardHeader className="pb-4">
          <CardTitle className="font-heading text-lg text-white">Filtrar lista</CardTitle>
          <CardDescription>
            O potencial (POT) é o overall máximo que o jogador pode atingir na carreira, no FIFA 23.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <div className="space-y-2 lg:col-span-4">
                <Label htmlFor="q">Nome</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="q"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Ex.: Mbappé, Silva…"
                    className="border-white/10 bg-black/25 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="pos">Posição</Label>
                <Input
                  id="pos"
                  value={position}
                  onChange={(e) => setPosition(e.target.value.toUpperCase())}
                  placeholder="ST, CM, CB…"
                  className="border-white/10 bg-black/25"
                />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label htmlFor="minO">OVR min.</Label>
                <Input
                  id="minO"
                  type="number"
                  min={0}
                  max={99}
                  value={minOverall}
                  onChange={(e) => setMinOverall(e.target.value)}
                  className="border-white/10 bg-black/25"
                />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label htmlFor="minP">POT min.</Label>
                <Input
                  id="minP"
                  type="number"
                  min={0}
                  max={99}
                  value={minPotential}
                  onChange={(e) => setMinPotential(e.target.value)}
                  className="border-white/10 bg-black/25"
                />
              </div>
              <div className="space-y-2 lg:col-span-1">
                <Label htmlFor="age">Idade máx.</Label>
                <Input
                  id="age"
                  type="number"
                  min={16}
                  max={55}
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  className="border-white/10 bg-black/25"
                />
              </div>
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="sort">Ordenar por</Label>
                <div className="flex flex-wrap gap-2">
                  <select
                    id="sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="h-9 flex-1 min-w-[140px] rounded-md border border-white/10 bg-black/25 px-2 text-sm text-foreground"
                  >
                    <option value="overall">Overall (OVR)</option>
                    <option value="potential">Potencial (POT)</option>
                    <option value="value">Valor de mercado</option>
                    <option value="wage">Salário</option>
                    <option value="age">Idade</option>
                    <option value="name">Nome</option>
                  </select>
                  <select
                    value={order}
                    onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
                    className="h-9 w-[110px] rounded-md border border-white/10 bg-black/25 px-2 text-sm text-foreground"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              Aplicar filtros
            </Button>
          </form>
        </CardContent>
      </Card>

      {err ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-card/40">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="w-[52px]" />
              <TableHead>Jogador</TableHead>
              <TableHead>Clube</TableHead>
              <TableHead className="text-center">Pos</TableHead>
              <TableHead className="text-center">Idade</TableHead>
              <TableHead className="text-center">OVR</TableHead>
              <TableHead className="text-center">POT</TableHead>
              <TableHead className="text-center">Δ</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data?.items.length ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  A carregar…
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  Nenhum jogador com estes filtros.
                </TableCell>
              </TableRow>
            ) : null}
            {data?.items.map((pl) => (
              <TableRow key={pl.id} className="border-white/5">
                <TableCell className="w-[52px] align-middle">
                  <Link href={`/players/${pl.id}`} className="block" aria-label={`Ficha de ${pl.name}`}>
                    <PlayerAvatar src={pl.imageUrl} alt={pl.name} size={40} />
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  <Link
                    href={`/players/${pl.id}`}
                    className="group block hover:text-[var(--fifa-accent)]"
                  >
                    <div>{pl.name}</div>
                    <div className="text-[11px] text-muted-foreground group-hover:text-muted-foreground">
                      {pl.nationality}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                  {pl.team.name}
                  {pl.team.league ? (
                    <span className="hidden text-[11px] sm:block"> · {pl.team.league}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-center tabular-nums">{pl.position}</TableCell>
                <TableCell className="text-center tabular-nums">{pl.age}</TableCell>
                <TableCell className="text-center">
                  <span className="font-heading tabular-nums text-[var(--fifa-accent)]">
                    {pl.overall}
                  </span>
                </TableCell>
                <TableCell className="text-center tabular-nums">{pl.potential}</TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "tabular-nums",
                      growth(pl.overall, pl.potential) >= 10
                        ? "border-[var(--fifa-accent)]/40 bg-[var(--fifa-accent)]/15 text-[var(--fifa-accent)]"
                        : "",
                    )}
                  >
                    +{growth(pl.overall, pl.potential)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatEuro(pl.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Página {data.page} de {data.totalPages} · {data.total.toLocaleString("pt-BR")}{" "}
              jogadores (filtro)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={curPage <= 1 || loading}
                onClick={() => void fetchPage(curPage - 1)}
                className="gap-1 border-white/10"
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={curPage >= data.totalPages || loading}
                onClick={() => void fetchPage(curPage + 1)}
                className="gap-1 border-white/10"
              >
                Seguinte
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-white/10 bg-card/60">
      <CardHeader className="pb-2 pt-4">
        <CardDescription className="text-[10px] font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle className="font-heading text-2xl text-white tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
