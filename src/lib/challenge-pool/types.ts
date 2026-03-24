import type { Player, Team } from "@prisma/client";

export type ChallengeDifficulty = "easy" | "medium" | "hard";

export type ChallengeKind =
  | "TEAM"
  | "PLAYER"
  | "TACTICAL"
  | "FINANCIAL"
  | "YOUTH"
  | "HARDCORE"
  | "STORY"
  | "CHAOS";

export const CHALLENGE_KINDS: ChallengeKind[] = [
  "TEAM",
  "PLAYER",
  "TACTICAL",
  "FINANCIAL",
  "YOUTH",
  "HARDCORE",
  "STORY",
  "CHAOS",
];

export type ObjectiveJson = {
  type: string;
  description: string;
  targetValue?: string;
};

export type TacticsJson = {
  formation?: string;
  style?: string;
  width?: number;
  depth?: number;
  notes?: string[];
};

export type RulePart = {
  /** Trecho curto para o título composto */
  short: string;
  objectives: ObjectiveJson[];
  restrictions: string[];
  tacticNotes: string[];
  narrativeHints: string[];
};

export type GenContext = {
  team: Team;
  player: Player;
  formation: string;
  style: string;
  int: (min: number, max: number) => number;
  pick: <T>(arr: T[]) => T;
};

export type RuleBuilder = (ctx: GenContext) => RulePart;
