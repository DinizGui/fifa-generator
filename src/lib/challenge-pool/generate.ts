import "server-only";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { BUILDERS_BY_KIND } from "./builders";
import {
  CHALLENGE_KINDS,
  type ChallengeDifficulty,
  type ChallengeKind,
  type GenContext,
  type ObjectiveJson,
  type RulePart,
  type TacticsJson,
} from "./types";

const FORMATIONS = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "5-3-2", "4-1-4-1", "3-4-3", "4-2-2-2"];
const STYLES = ["posse", "contra-ataque", "pressão alta", "retranca", "equilibrado"];

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function pickChallengeKinds(bias: ChallengeDifficulty): ChallengeKind[] {
  const r = Math.random();
  let n = 1;
  if (bias === "easy") n = r < 0.72 ? 1 : r < 0.93 ? 2 : 3;
  else if (bias === "medium") n = r < 0.38 ? 1 : r < 0.78 ? 2 : 3;
  else n = r < 0.16 ? 1 : r < 0.48 ? 2 : 3;

  const pool = [...CHALLENGE_KINDS];
  shuffleInPlace(pool);
  const picked = pool.slice(0, n);
  picked.sort();
  return picked;
}

export function inferStoredDifficulty(types: ChallengeKind[], restrictionCount: number): ChallengeDifficulty {
  const weight = types.length * 2 + Math.min(restrictionCount, 12) * 0.45 + (types.includes("HARDCORE") ? 1.5 : 0) + (types.includes("CHAOS") ? 0.8 : 0);
  if (weight <= 3.2) return "easy";
  if (weight <= 5.8) return "medium";
  return "hard";
}

function stableSerializeForSignature(payload: {
  types: ChallengeKind[];
  teamId: number | null;
  playerId: number | null;
  objectives: ObjectiveJson[];
  restrictions: string[];
  tactics: TacticsJson;
}): string {
  const norm = {
    types: [...payload.types].sort(),
    teamId: payload.teamId,
    playerId: payload.playerId,
    objectives: payload.objectives.map((o) => ({
      type: o.type,
      description: o.description,
      targetValue: o.targetValue ?? null,
    })),
    restrictions: [...payload.restrictions].sort(),
    tactics: {
      formation: payload.tactics.formation ?? null,
      style: payload.tactics.style ?? null,
      width: payload.tactics.width ?? null,
      depth: payload.tactics.depth ?? null,
      notes: [...(payload.tactics.notes ?? [])].sort(),
    },
  };
  return JSON.stringify(norm);
}

export function challengeSignature(payload: Parameters<typeof stableSerializeForSignature>[0]): string {
  return createHash("sha256").update(stableSerializeForSignature(payload)).digest("hex");
}

export async function sampleGenContext(): Promise<GenContext> {
  const teamWhere = { players: { some: {} } };
  const nTeams = await prisma.team.count({ where: teamWhere });
  if (!nTeams) {
    throw new Error("Nenhum time com jogadores. Execute: npm run import:fifa23");
  }

  const skipTeam = Math.floor(Math.random() * nTeams);
  const team = (
    await prisma.team.findMany({
      where: teamWhere,
      skip: skipTeam,
      take: 1,
      orderBy: { id: "asc" },
    })
  )[0];
  if (!team) throw new Error("Falha ao sortear time.");

  const playerCount = await prisma.player.count({ where: { teamId: team.id } });
  if (!playerCount) throw new Error("Time sem jogadores.");
  const skipPlayer = Math.floor(Math.random() * playerCount);
  const player = (
    await prisma.player.findMany({
      where: { teamId: team.id },
      skip: skipPlayer,
      take: 1,
      orderBy: { id: "asc" },
    })
  )[0];
  if (!player) throw new Error("Falha ao sortear jogador.");

  const formation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];

  const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  return { team, player, formation, style, int, pick };
}

const KIND_LABEL: Record<ChallengeKind, string> = {
  TEAM: "Clube",
  PLAYER: "Jogador",
  TACTICAL: "Tática",
  FINANCIAL: "Financeiro",
  YOUTH: "Base / juventude",
  HARDCORE: "Hardcore",
  STORY: "História",
  CHAOS: "Caos",
};

function mergeParts(parts: RulePart[], ctx: GenContext, kinds: ChallengeKind[]): { name: string; narrative: string } {
  const name = parts.map((p) => p.short).join(" · ");
  const hints = parts.flatMap((p) => p.narrativeHints);
  const base = hints.length ? hints.join(" ") + " " : "";
  const kindsPt = kinds.map((k) => KIND_LABEL[k]).join(", ");
  const narrative = `${base}Contexto: ${ctx.team.name}${
    kinds.includes("PLAYER") ? `, com foco em ${ctx.player.name} (${ctx.player.position}).` : "."
  } Eixos do desafio: ${kindsPt}.`.trim();
  return { name, narrative };
}

export type GeneratedChallengeRow = {
  name: string;
  difficulty: string;
  types: ChallengeKind[];
  narrative: string;
  objectives: ObjectiveJson[];
  restrictions: string[];
  tactics: TacticsJson;
  signature: string;
  teamId: number;
  playerId: number | null;
};

export async function generateOneChallenge(bias: ChallengeDifficulty = "medium"): Promise<GeneratedChallengeRow> {
  const ctx = await sampleGenContext();
  const kinds = pickChallengeKinds(bias);
  const parts: RulePart[] = [];

  for (const kind of kinds) {
    const builders = BUILDERS_BY_KIND[kind];
    const idx = Math.floor(Math.random() * builders.length);
    parts.push(builders[idx]!(ctx));
  }

  const objectives = parts.flatMap((p) => p.objectives);
  const restrictions = [...new Set(parts.flatMap((p) => p.restrictions))];
  const tacticNotes = [...new Set(parts.flatMap((p) => p.tacticNotes))];

  const tacticsForDb: TacticsJson = {
    formation: ctx.formation,
    style: ctx.style,
    notes: tacticNotes,
  };

  const { name, narrative } = mergeParts(parts, ctx, kinds);
  const difficulty = inferStoredDifficulty(kinds, restrictions.length);

  const includePlayer = kinds.includes("PLAYER");

  const payloadForSig = {
    types: kinds,
    teamId: ctx.team.id,
    playerId: includePlayer ? ctx.player.id : null,
    objectives,
    restrictions,
    tactics: tacticsForDb,
  };

  const signature = challengeSignature(payloadForSig);

  return {
    name,
    difficulty,
    types: kinds,
    narrative,
    objectives,
    restrictions,
    tactics: tacticsForDb,
    signature,
    teamId: ctx.team.id,
    playerId: includePlayer ? ctx.player.id : null,
  };
}

export type GenerateChallengesResult = {
  requested: number;
  created: number;
  skippedDuplicate: number;
  attempts: number;
};

export async function generateChallenges(
  count: number,
  options?: { bias?: ChallengeDifficulty; maxAttemptsMultiplier?: number },
): Promise<GenerateChallengesResult> {
  const bias = options?.bias ?? "medium";
  const mult = options?.maxAttemptsMultiplier ?? 30;
  const maxAttempts = Math.max(count * mult, count + 50);

  let created = 0;
  let skippedDuplicate = 0;
  let attempts = 0;

  while (created < count && attempts < maxAttempts) {
    attempts++;
    const row = await generateOneChallenge(bias);
    try {
      await prisma.challenge.create({
        data: {
          name: row.name,
          difficulty: row.difficulty,
          types: row.types,
          narrative: row.narrative,
          objectives: row.objectives,
          restrictions: row.restrictions,
          tactics: row.tactics,
          signature: row.signature,
          teamId: row.teamId,
          playerId: row.playerId,
        },
      });
      created++;
    } catch (e: unknown) {
      const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : undefined;
      if (code === "P2002") skippedDuplicate++;
      else throw e;
    }
  }

  return { requested: count, created, skippedDuplicate, attempts };
}
