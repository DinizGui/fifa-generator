import "server-only";

import type { PrismaClient } from "@prisma/client";

/** Delegates necessários para clonar o plantel (funciona com `prisma` ou `tx` dentro de `$transaction`). */
export type SquadCloneDb = Pick<PrismaClient, "player" | "careerPlayer">;

/** Conta jogadores reais (`Player`) ligados ao clube. */
export async function validateTeamPlayersCount(db: SquadCloneDb, teamId: number): Promise<number> {
  const count = await db.player.count({ where: { teamId } });
  console.log("[career-squad] validateTeamPlayers: teamId=%d → jogadores no banco (Player): %d", teamId, count);
  return count;
}

/**
 * Copia todos os `Player` do `teamId` para `CareerPlayer` da carreira.
 * Sem `skipDuplicates` — falha explícita se houver choque em @@unique([careerId, playerId]).
 */
export async function cloneTeamRosterToCareer(
  db: SquadCloneDb,
  careerId: number,
  teamId: number,
  options?: { log?: boolean },
): Promise<{ expected: number; inserted: number }> {
  const wantLog = options?.log ?? true;

  const players = await db.player.findMany({
    where: { teamId },
    orderBy: [{ overall: "desc" }, { id: "asc" }],
  });

  if (wantLog) {
    console.log(
      "[career-squad] cloneTeamRosterToCareer: careerId=%d teamId=%d → findMany count=%d",
      careerId,
      teamId,
      players.length,
    );
  }

  if (players.length === 0) {
    console.warn(
      "[career-squad] Nenhum jogador encontrado para teamId=%d. Confirme import (npm run import:fifa23) e sofifaId no modelo Player.",
      teamId,
    );
    return { expected: 0, inserted: 0 };
  }

  if (players.length === 1) {
    console.warn(
      "[career-squad] Apenas 1 jogador no clube no DB — provável import antigo ou nomes duplicados. Rode de novo: npm run import:fifa23",
    );
  }

  const existing = await db.careerPlayer.findMany({
    where: { careerId },
    select: { playerId: true },
  });
  const already = new Set(existing.map((r) => r.playerId));
  const toCreate = players.filter((p) => !already.has(p.id));

  if (toCreate.length === 0 && existing.length > 0) {
    if (wantLog) console.log("[career-squad] Elenco já populado (%d linhas), a saltar inserções.", existing.length);
    const inserted = await db.careerPlayer.count({ where: { careerId } });
    return { expected: players.length, inserted };
  }

  if (toCreate.length) {
    await db.careerPlayer.createMany({
      data: toCreate.map((p, idx) => {
        const globalIndex = players.findIndex((x) => x.id === p.id);
        return {
          careerId,
          playerId: p.id,
          teamId,
          overallAtual: p.overall,
          valorAtual: p.value,
          salarioAtual: p.wage,
          status: globalIndex < 11 ? "STARTER" : "RESERVE",
          isTitular: globalIndex < 11,
        };
      }),
    });
  }

  const inserted = await db.careerPlayer.count({ where: { careerId } });
  if (wantLog) {
    console.log(
      "[career-squad] CareerPlayer após clone: careerId=%d → total=%d (esperado alinhar com %d jogadores do clube)",
      careerId,
      inserted,
      players.length,
    );
  }

  if (inserted !== players.length) {
    console.warn(
      "[career-squad] ATENÇÃO: esperado %d career_players para cobrir o plantel, existe %d.",
      players.length,
      inserted,
    );
  }

  return { expected: players.length, inserted };
}
