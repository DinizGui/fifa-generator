"use client";

import { useState } from "react";
import { Loader2, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SquadPlayer = {
  id: number;
  playerId: number;
  overallAtual: number;
  valorAtual: number;
  status: "STARTER" | "RESERVE" | "LOANED" | "SOLD" | "FREE_AGENT";
  isTitular: boolean;
  player: {
    id: number;
    name: string;
    position: string;
  };
};

type MarketPlayer = {
  id: number;
  name: string;
  position: string;
  overall: number;
  value: number;
};

const statusLabel: Record<SquadPlayer["status"], string> = {
  STARTER: "Titular",
  RESERVE: "Reserva",
  LOANED: "Emprestado",
  SOLD: "Vendido",
  FREE_AGENT: "Livre",
};

function statusBadgeClass(status: SquadPlayer["status"]) {
  switch (status) {
    case "STARTER":
      return "border-[var(--fifa-accent)]/50 bg-[var(--fifa-accent)]/15 text-[var(--fifa-accent)]";
    case "SOLD":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "LOANED":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    default:
      return "border-white/10 bg-white/5 text-muted-foreground";
  }
}

export function SquadManager({ careerId, initialSquad }: { careerId: number; initialSquad: SquadPlayer[] }) {
  const [squad, setSquad] = useState<SquadPlayer[]>(initialSquad);
  const [players, setPlayers] = useState<MarketPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [minOverall, setMinOverall] = useState("");
  const [marketOpen, setMarketOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyPlayerId, setBusyPlayerId] = useState<number | null>(null);

  async function loadSquad() {
    const res = await fetch(`/api/squad?careerId=${careerId}`);
    const data = await res.json();
    if (res.ok) setSquad(data);
  }

  async function searchPlayers() {
    setSearching(true);
    try {
      const qs = new URLSearchParams({
        name: search,
        position,
        minOverall: minOverall || "0",
        maxAge: "99",
      });
      const res = await fetch(`/api/players?${qs.toString()}`);
      const data = await res.json();
      if (res.ok) setPlayers(data);
    } finally {
      setSearching(false);
    }
  }

  async function hire(playerId: number, value: number) {
    setBusyPlayerId(playerId);
    try {
      await fetch("/api/transfers/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerId, playerId, value }),
      });
      await loadSquad();
      setMarketOpen(false);
    } finally {
      setBusyPlayerId(null);
    }
  }

  async function sell(playerId: number, value: number) {
    setBusyPlayerId(playerId);
    try {
      await fetch("/api/transfers/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerId, playerId, value }),
      });
      await loadSquad();
    } finally {
      setBusyPlayerId(null);
    }
  }

  async function updatePlayer(
    careerPlayerId: number,
    patch: Partial<Pick<SquadPlayer, "overallAtual" | "isTitular" | "status">>,
  ) {
    await fetch("/api/squad", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careerId, careerPlayerId, ...patch }),
    });
    await loadSquad();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
          <Button type="button" className="gap-2 font-heading uppercase" onClick={() => setMarketOpen(true)}>
            <ShoppingCart className="size-4" />
            Mercado de contratações
          </Button>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden border-white/10 bg-zinc-950/95 p-0 text-zinc-100 backdrop-blur-xl">
            <DialogHeader className="border-b border-white/5 px-6 py-4">
              <DialogTitle className="font-heading text-lg text-white">Buscar jogadores</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Dados da base global FIFA. Contratar só altera esta carreira.
              </p>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <Input
                  placeholder="Nome"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-white/10 bg-black/30 sm:col-span-2"
                />
                <Input
                  placeholder="Posição"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="border-white/10 bg-black/30"
                />
                <Input
                  placeholder="OVR mín."
                  value={minOverall}
                  onChange={(e) => setMinOverall(e.target.value)}
                  className="border-white/10 bg-black/30"
                />
              </div>
              <Button className="gap-2" disabled={searching} onClick={searchPlayers}>
                {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Buscar
              </Button>
            </div>
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto border-t border-white/5 px-6 py-4">
              {players.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Use os filtros e busque para listar jogadores.
                </p>
              ) : (
                players.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.position} · OVR <span className="tabular-nums text-[var(--fifa-accent)]">{p.overall}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        € {p.value.toLocaleString("pt-BR")}
                      </span>
                      <Button
                        size="sm"
                        disabled={busyPlayerId === p.id}
                        onClick={() => hire(p.id, p.value)}
                        className="gap-1"
                      >
                        {busyPlayerId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                        Contratar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden border-white/10 bg-card/60">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="font-heading text-lg text-white">Plantel</CardTitle>
          <CardDescription>
            Edite o overall para acompanhar o progresso no console. Titulares ajudam a organizar o time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {squad.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Nenhum jogador no elenco. Importe dados ou gere uma carreira para clonar o time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Jogador</TableHead>
                    <TableHead className="text-muted-foreground">Pos.</TableHead>
                    <TableHead className="text-muted-foreground">OVR</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-center text-muted-foreground">Titular</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {squad.map((sp) => (
                    <TableRow key={sp.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="font-medium text-foreground">{sp.player.name}</TableCell>
                      <TableCell className="text-muted-foreground">{sp.player.position}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-14 border-white/10 bg-black/30 text-center tabular-nums"
                          defaultValue={sp.overallAtual}
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isNaN(n)) updatePlayer(sp.id, { overallAtual: n });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-normal", statusBadgeClass(sp.status))}>
                          {statusLabel[sp.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={sp.isTitular}
                          onClick={() =>
                            updatePlayer(sp.id, {
                              isTitular: !sp.isTitular,
                              status: !sp.isTitular ? "STARTER" : "RESERVE",
                            })
                          }
                          className={cn(
                            "relative mx-auto inline-flex h-6 w-11 shrink-0 rounded-full border transition",
                            sp.isTitular
                              ? "border-[var(--fifa-accent)]/50 bg-[var(--fifa-accent)]/25"
                              : "border-white/10 bg-black/40",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                              sp.isTitular ? "left-5" : "left-0.5",
                            )}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyPlayerId === sp.playerId}
                          onClick={() => sell(sp.playerId, sp.valorAtual)}
                        >
                          {busyPlayerId === sp.playerId ? <Loader2 className="size-3.5 animate-spin" /> : "Vender"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
