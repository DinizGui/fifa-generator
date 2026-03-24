import { createHash } from "crypto";
import type { PresetChallengeInput } from "./preset-challenges-data";
import type { ChallengeKind } from "./types";

const LABEL_TO_KIND: Record<string, ChallengeKind> = {
  Player: "PLAYER",
  Team: "TEAM",
  Youth: "YOUTH",
  Financial: "FINANCIAL",
  Tactical: "TACTICAL",
  Chaos: "CHAOS",
  Hardcore: "HARDCORE",
  Story: "STORY",
};

export function normalizePresetTypes(labels: string[]): ChallengeKind[] {
  return labels.map((t) => LABEL_TO_KIND[t] ?? "TEAM");
}

/** Assinatura estável para upsert no banco (catalogo). */
export function presetCatalogSignature(p: PresetChallengeInput): string {
  const payload = {
    v: 1,
    name: p.name,
    difficulty: p.difficulty,
    types: [...p.type].sort(),
    objectives: p.objectives,
    restrictions: p.restrictions,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function presetToDbPayload(p: PresetChallengeInput) {
  const types = normalizePresetTypes(p.type);
  const objectives = p.objectives.map((description, i) => ({
    type: "preset",
    description,
    order: i,
  }));
  const narrative = `Desafio catalogo "${p.name}" (${p.difficulty}): aplique no FIFA 23 conforme seu clube e elenco reais — metas e restricoes abaixo.`;
  const tactics = {
    source: "preset",
    formation: null as string | null,
    style: null as string | null,
    notes: [] as string[],
  };

  return {
    name: p.name,
    difficulty: p.difficulty,
    types,
    narrative,
    objectives,
    restrictions: p.restrictions,
    tactics,
    signature: `preset:${presetCatalogSignature(p)}`,
    teamId: null as number | null,
    playerId: null as number | null,
  };
}
