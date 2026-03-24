import { ChallengeType, Team } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cloneTeamRosterToCareer, validateTeamPlayersCount } from "@/lib/career-squad-clone";

type Difficulty = "easy" | "medium" | "hard" | "legendary";

type GeneratorParams = {
  userId: number;
  name: string;
  difficulty?: Difficulty;
};

const difficultyMultiplier: Record<Difficulty, number> = {
  easy: 1.25,
  medium: 1,
  hard: 0.82,
  /** Orçamento mais apertado — carreira precisa virar com menos margem. */
  legendary: 0.58,
};

const formationByStyle: Record<string, string[]> = {
  posse: ["4-3-3", "4-2-3-1"],
  "contra-ataque": ["4-4-2", "5-3-2"],
  "pressao alta": ["4-2-2-2", "4-3-3"],
  equilibrado: ["4-3-3", "4-1-4-1"],
};

const challengeStyleMap: Record<string, string[]> = {
  reconstruction: ["equilibrado", "pressao alta"],
  road_to_glory: ["contra-ataque", "equilibrado"],
  giant_in_crisis: ["posse", "pressao alta"],
  moneyball: ["equilibrado", "contra-ataque"],
  youth_academy: ["pressao alta", "equilibrado"],
  realistic_career: ["equilibrado", "posse"],
  save_small_club: ["contra-ataque", "equilibrado"],
  european_project: ["posse", "pressao alta"],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPickByWeight<T>(items: T[], weights: number[]): T {
  if (items.length === 0) throw new Error("weightedPickByWeight: lista vazia.");
  if (items.length !== weights.length) throw new Error("weightedPickByWeight: tamanhos diferentes.");
  const safe = weights.map((w) => Math.max(w, 1e-9));
  const total = safe.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= safe[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export async function getRandomChallengeType() {
  const all = await prisma.challengeType.findMany();
  if (!all.length) {
    throw new Error("Nenhum tipo de desafio cadastrado.");
  }
  return pickRandom(all);
}

/** Força do clube = média de overall dos jogadores (fallback: reputation). */
async function teamStrengthMap(teams: Team[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!teams.length) return map;

  const grouped = await prisma.player.groupBy({
    by: ["teamId"],
    _avg: { overall: true },
  });
  for (const row of grouped) {
    const v = row._avg.overall;
    if (v != null) map.set(row.teamId, v);
  }

  for (const t of teams) {
    if (!map.has(t.id)) map.set(t.id, t.reputation);
  }
  return map;
}

export async function pickRandomTeamByDifficulty(difficulty: Difficulty): Promise<Team> {
  const teams = await prisma.team.findMany();
  if (!teams.length) throw new Error("Nenhum time cadastrado no banco. Importe o CSV (npm run import:fifa23).");

  const strengthByTeam = await teamStrengthMap(teams);

  const scored = teams.map((team) => ({
    team,
    s: strengthByTeam.get(team.id) ?? team.reputation,
  }));

  const sorted = [...scored].sort((a, b) => b.s - a.s);
  const nTeams = teams.length;

  const sVals = scored.map((x) => x.s);
  const minS = Math.min(...sVals);
  const maxS = Math.max(...sVals);
  const span = maxS - minS || 1;

  const eliteN = Math.max(5, Math.ceil(nTeams * 0.12));
  const eliteIds = new Set(sorted.slice(0, eliteN).map((x) => x.team.id));
  const smallIds = new Set(sorted.slice(-eliteN).map((x) => x.team.id));

  /** Top global por média de overall (gigantes / grandes ligas pesam mais no “fácil”). */
  const topGlobalN = Math.max(12, Math.ceil(nTeams * 0.08));
  const topGlobalIds = new Set(sorted.slice(0, topGlobalN).map((x) => x.team.id));

  if (difficulty === "easy") {
    /**
     * Antes: pesos favoreciam elencos fortes, mas ~hundreds de clubes médios somavam massa enorme —
     * times como Estoril saíam com frequência. Agora o sorteio é só entre os ~28% melhores elencos
     * (mín. 40 clubes), com peso ~cúbico para o topo desse grupo + boost em elite global.
     */
    const poolSize = Math.max(40, Math.ceil(nTeams * 0.28));
    const pool = sorted.slice(0, poolSize);
    const poolMin = pool[pool.length - 1].s;
    const poolMax = pool[0].s;
    const poolSpan = poolMax - poolMin || 1;

    const weights = pool.map((x) => {
      const n = (x.s - poolMin) / poolSpan;
      let w = 0.1 + Math.pow(n, 3.4) * 62;
      if (eliteIds.has(x.team.id)) w *= 2.8;
      if (topGlobalIds.has(x.team.id)) w *= 2.1;
      return Math.max(w, 0.06);
    });

    return weightedPickByWeight(
      pool.map((x) => x.team),
      weights,
    );
  }

  const weights = scored.map(({ team, s }) => {
    const n = (s - minS) / span;
    let w = 1;
    switch (difficulty) {
      case "medium":
        w = 0.55 + Math.sin(n * Math.PI) * 0.65;
        break;
      case "hard":
        w = 0.2 + Math.pow(1 - n, 2.1) * 8;
        if (smallIds.has(team.id)) w *= 2.6;
        if (eliteIds.has(team.id)) w *= 0.35;
        break;
      case "legendary":
        w = 0.08 + Math.pow(1 - n, 3.6) * 18;
        if (smallIds.has(team.id)) w *= 4.2;
        /** Quase nunca elenco já pronto — evita "Legendary" em gigante europeu por acaso. */
        if (eliteIds.has(team.id)) w *= 0.06;
        break;
      default:
        w = 1;
    }
    return Math.max(w, 0.08);
  });

  return weightedPickByWeight(
    scored.map((x) => x.team),
    weights,
  );
}

function computeBudget(team: Team, difficulty: Difficulty, challengeSlug: string) {
  let base = Math.max(3_000_000, team.reputation * 700_000);
  if (challengeSlug === "moneyball") base *= 0.75;
  if (challengeSlug === "giant_in_crisis") base *= 1.15;
  return Math.round(base * difficultyMultiplier[difficulty]);
}

type RepTier = "elite" | "strong" | "mid" | "weak" | "small";

function reputationTier(rep: number): RepTier {
  if (rep >= 78) return "elite";
  if (rep >= 68) return "strong";
  if (rep >= 58) return "mid";
  if (rep >= 48) return "weak";
  return "small";
}

/** Metas de liga escalonam pela força do clube e pela dificuldade pedida. */
function leagueGoalDescription(team: Team, difficulty: Difficulty): { description: string; targetValue: string } {
  const tier = reputationTier(team.reputation);
  const table: Record<Difficulty, Record<RepTier, { description: string; targetValue: string }>> = {
    easy: {
      elite: { description: "Terminar a liga no top 6.", targetValue: "Top 6" },
      strong: { description: "Terminar a liga no top 10.", targetValue: "Top 10" },
      mid: { description: "Terminar a liga no top 12.", targetValue: "Top 12" },
      weak: { description: "Evitar rebaixamento com tranquilidade (folga de pontos na reta final).", targetValue: "Salvar-se" },
      small: { description: "Evitar rebaixamento.", targetValue: "Permanência" },
    },
    medium: {
      elite: { description: "Terminar a liga no top 4.", targetValue: "Top 4" },
      strong: { description: "Terminar a liga no top 6.", targetValue: "Top 6" },
      mid: { description: "Terminar a liga no top 10.", targetValue: "Top 10" },
      weak: { description: "Evitar rebaixamento e buscar metade superior da tabela.", targetValue: "Top half" },
      small: { description: "Evitar rebaixamento com pelo menos 6 pontos de folga na penúltima rodada.", targetValue: "Salvar-se" },
    },
    hard: {
      elite: { description: "Classificar para competição europeia (top 5 ou título).", targetValue: "Europa" },
      strong: { description: "Terminar a liga no top 4.", targetValue: "Top 4" },
      mid: { description: "Terminar a liga no top 6.", targetValue: "Top 6" },
      weak: { description: "Terminar a liga no top 10 sem derrota em casa contra o bottom 6.", targetValue: "Top 10" },
      small: { description: "Acabar na metade superior da tabela ou ganhar playoffs de acesso.", targetValue: "Evoluir" },
    },
    legendary: {
      elite: {
        description: "Vencer a liga nacional (título obrigatório) e chegar às quartas da Champions.",
        targetValue: "Liga + UCL QF",
      },
      strong: {
        description: "Vencer a liga ou terminar no top 2 a até 3 pontos do líder, com vaga europeia garantida.",
        targetValue: "Top 2 + Europa",
      },
      mid: {
        description: "Terminar no top 4 e ir até semifinal de copa nacional.",
        targetValue: "Top 4 + copa semi",
      },
      weak: {
        description: "Terminar no top 8 com média de público/renda estável (sem crise) e vencer 3 jogos seguidos na reta final.",
        targetValue: "Top 8 + sequência",
      },
      small: {
        description: "Subir de divisão (automático ou via playoff) ou, impossível no save, ganhar 70% dos pontos na 2ª volta.",
        targetValue: "Acesso ou 2ª volta",
      },
    },
  };

  return table[difficulty][tier];
}

function cupObjectiveDescription(team: Team, difficulty: Difficulty): string {
  const tier = reputationTier(team.reputation);
  if (difficulty === "legendary") {
    if (tier === "elite" || tier === "strong") return "Vencer a copa nacional ou chegar à final sem perder em casa.";
    return "Chegar à semifinal da copa nacional e vencer pelo menos um clube de rep 75+ no caminho.";
  }
  if (difficulty === "hard") {
    return team.reputation >= 72
      ? "Chegar à final da copa nacional."
      : "Chegar à semifinal da copa nacional.";
  }
  if (team.reputation >= 75) return "Chegar pelo menos na semifinal da copa.";
  return "Chegar pelo menos nas quartas da copa.";
}

function financeObjectiveDescription(budget: number, difficulty: Difficulty): string {
  if (difficulty === "legendary") {
    return budget > 28_000_000
      ? "Lucro líquido positivo em transferências e saldo de caixa maior no fim do ano do que no início."
      : "Reduzir folha em 12% e não registrar déficit em nenhum mês simulado.";
  }
  if (difficulty === "hard") {
    return budget > 30_000_000
      ? "Fechar a temporada com saldo positivo e vender ao menos um jogador por proposta irrecusável."
      : "Reduzir folha salarial em pelo menos 10%.";
  }
  return budget > 30_000_000 ? "Fechar a temporada com saldo positivo." : "Reduzir folha salarial em pelo menos 10%.";
}

function transferWindowObjective(difficulty: Difficulty, challengeType: ChallengeType): string {
  if (challengeType.slug === "youth_academy" || challengeType.slug === "road_to_glory") {
    return difficulty === "legendary"
      ? "Realizar no máximo 2 contratações de jogadores já profissionais por janela."
      : "";
  }
  switch (difficulty) {
    case "easy":
      return "Realizar no máximo 5 contratações compradas por janela (empréstimos livres contam metade).";
    case "medium":
      return "Realizar no máximo 4 contratações compradas por janela.";
    case "hard":
      return "Realizar no máximo 3 contratações compradas por janela.";
    case "legendary":
      return "Realizar no máximo 2 contratações compradas por janela (empréstimos com obrigação de compra contam).";
    default:
      return "Limitar janela de transferências de forma responsável.";
  }
}

export function generateObjectives(
  challengeType: ChallengeType,
  team: Team,
  difficulty: Difficulty,
  budget: number,
) {
  const league = leagueGoalDescription(team, difficulty);
  const transferRule = transferWindowObjective(difficulty, challengeType);

  const objectives: Array<{ type: string; description: string; targetValue?: string }> = [
    { type: "league", description: league.description, targetValue: league.targetValue },
    { type: "cup", description: cupObjectiveDescription(team, difficulty) },
    { type: "finance", description: financeObjectiveDescription(budget, difficulty) },
  ];

  if (challengeType.slug === "youth_academy" || challengeType.slug === "road_to_glory") {
    objectives.push({
      type: "youth",
      description:
        difficulty === "legendary"
          ? "Promover e utilizar ao menos 3 jogadores sub-21 como titulares em 22 jogos (somando minutos)."
          : "Promover e utilizar ao menos 2 jogadores sub-21 como titulares em 15 jogos.",
    });
  }
  if (transferRule) {
    objectives.push({ type: "transfers", description: transferRule });
  }

  if (difficulty === "legendary") {
    objectives.push({
      type: "form",
      description:
        "Não perder por mais de 1 gol de diferença contra times do top 3 da liga (mínimo 4 confrontos).",
    });
  }

  return objectives;
}

export function generateRestrictions(
  challengeType: ChallengeType,
  difficulty: Difficulty,
  team: Team,
  budget: number,
) {
  const pool = [
    "Contratar apenas jogadores com até 24 anos.",
    "No máximo 3 contratações por janela.",
    "Usar pelo menos 2 jogadores da base ou categorias inferiores como titulares em 12 jogos.",
    "Não contratar jogadores acima de 82 de overall.",
    "Não contratar jogadores de rival direto da liga.",
    "Priorizar atletas da mesma nacionalidade da liga.",
    "Vender qualquer jogador com proposta superior a 150% do valor de mercado.",
    "Reduzir média de idade do elenco em 1.5 anos.",
  ];

  const legendaryPool = [
    "Plantel final da temporada: no máximo 3 jogadores com overall 83+ (contando reservas).",
    "Não usar mais de 2 substituições em pelo menos 10 jogos de liga ao longo do ano.",
    "Proibido renovar contrato de titular com aumento acima de 15% na primeira temporada.",
    "Indeferir qualquer proposta de compra abaixo de 90% do valor de mercado para titulares.",
    "Escalar o mesmo capitão em no máximo 60% dos jogos (alternar liderança).",
  ];

  const selected = new Set<string>();
  if (challengeType.slug === "moneyball" || budget < 25_000_000) {
    selected.add(
      difficulty === "legendary"
        ? "Folha salarial não pode ultrapassar 80% do patamar inicial em nenhum momento."
        : "Limite de folha salarial mensal: 85% do valor atual.",
    );
  }
  if (challengeType.slug === "youth_academy") {
    selected.add(
      difficulty === "legendary"
        ? "Obrigatório iniciar cada partida com no mínimo 3 jogadores sub-21 no onze."
        : "Obrigatório iniciar cada partida com no mínimo 2 jogadores sub-21.",
    );
  }
  if (difficulty === "hard") {
    selected.add("No máximo 3 contratações por janela.");
  }
  if (difficulty === "legendary") {
    const firstPick = pickRandom(legendaryPool);
    selected.add(firstPick);
    const rest = legendaryPool.filter((r) => r !== firstPick && !selected.has(r));
    if (rest.length) selected.add(pickRandom(rest));
    selected.add("Não contratar jogadores acima de 80 de overall (reforços novos).");
  }
  if (team.reputation >= 80 && difficulty !== "legendary") {
    selected.add("Obrigatório classificar para competição europeia em até 2 temporadas.");
  }

  const targetCount =
    difficulty === "legendary" ? 5 + Math.floor(Math.random() * 2) : Math.min(5, Math.max(2, 2 + Math.floor(Math.random() * 3)));

  const poolAvoidDupTransfers =
    difficulty === "legendary" ? pool.filter((p) => !p.includes("3 contratações por janela")) : pool;

  while (selected.size < targetCount) {
    const source =
      difficulty === "legendary" && Math.random() < 0.45 ? legendaryPool : poolAvoidDupTransfers;
    selected.add(pickRandom(source.length ? source : pool));
  }

  return Array.from(selected).slice(0, 6);
}

export function generateNarrative(challengeType: ChallengeType, team: Team, difficulty: Difficulty) {
  const tone =
    difficulty === "legendary"
      ? "Modo lendário: margem zero para erro, orçamento apertado e metas agressivas — a torcida e a diretoria não aceitam desculpas."
    : difficulty === "hard"
      ? "A pressão é alta; cada decisão de mercado precisa ser cirúrgica."
      : "A diretoria quer evolução imediata com consistência ao longo da temporada.";

  return `O ${team.name} inicia um projeto de ${challengeType.name.toLowerCase()} em busca de estabilidade e resultados. ${tone} O foco será montar um elenco competitivo sem abrir mão da identidade do clube e cumprir metas esportivas e financeiras realistas.`;
}

export function generateInitialTactic(challengeType: ChallengeType) {
  const styles = challengeStyleMap[challengeType.slug] ?? ["equilibrado"];
  const style = pickRandom(styles);
  const formation = pickRandom(formationByStyle[style] ?? ["4-3-3"]);

  return {
    style,
    formation,
    width: Math.floor(Math.random() * 25) + 40,
    depth: Math.floor(Math.random() * 25) + 40,
  };
}

/** Reidrata elenco completo (ex.: após migração). Corre dentro de uma transação. */
export async function cloneTeamPlayersToCareer(careerId: number, teamId: number) {
  await prisma.$transaction(async (tx) => {
    await validateTeamPlayersCount(tx, teamId);
    await cloneTeamRosterToCareer(tx, careerId, teamId, { log: true });
  });
}

export async function generateCareerChallenge(params: GeneratorParams) {
  const difficulty = params.difficulty ?? "medium";
  const challengeType = await getRandomChallengeType();

  const selectedTeam = await pickRandomTeamByDifficulty(difficulty);

  const budget = computeBudget(selectedTeam, difficulty, challengeType.slug);
  const objectives = generateObjectives(challengeType, selectedTeam, difficulty, budget);
  const restrictions = generateRestrictions(challengeType, difficulty, selectedTeam, budget);
  const narrativeText = generateNarrative(challengeType, selectedTeam, difficulty);
  const initialTactic = generateInitialTactic(challengeType);

  const career = await prisma.$transaction(async (tx) => {
    const created = await tx.career.create({
      data: {
        userId: params.userId,
        name: params.name,
        teamId: selectedTeam.id,
        challengeTypeId: challengeType.id,
        season: 1,
        budget,
        difficulty,
        mainObjective: objectives[0]?.description ?? "Evoluir o clube.",
        tacticalStyle: initialTactic.style,
        formation: initialTactic.formation,
      },
      include: {
        team: true,
        challengeType: true,
      },
    });

    await tx.careerObjective.createMany({
      data: objectives.map((o) => ({
        careerId: created.id,
        type: o.type,
        description: o.description,
        targetValue: o.targetValue,
      })),
    });

    await tx.careerRestriction.createMany({
      data: restrictions.map((description) => ({
        careerId: created.id,
        description,
      })),
    });

    await tx.careerNarrative.create({
      data: {
        careerId: created.id,
        text: narrativeText,
      },
    });

    await tx.tactic.create({
      data: {
        careerId: created.id,
        formation: initialTactic.formation,
        style: initialTactic.style,
        width: initialTactic.width,
        depth: initialTactic.depth,
      },
    });

    await validateTeamPlayersCount(tx, selectedTeam.id);
    await cloneTeamRosterToCareer(tx, created.id, selectedTeam.id, { log: true });

    return created;
  });

  const full = await prisma.career.findUnique({
    where: { id: career.id },
    include: {
      team: true,
      challengeType: true,
      objectives: true,
      restrictions: true,
      narrative: true,
      tactic: true,
    },
  });

  return full;
}
