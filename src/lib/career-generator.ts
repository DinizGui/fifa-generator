import { ChallengeType, Team } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  legendary: 0.7,
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

  const sVals = scored.map((x) => x.s);
  const minS = Math.min(...sVals);
  const maxS = Math.max(...sVals);
  const span = maxS - minS || 1;

  const sorted = [...scored].sort((a, b) => b.s - a.s);
  const eliteN = Math.max(3, Math.ceil(teams.length * 0.12));
  const eliteIds = new Set(sorted.slice(0, eliteN).map((x) => x.team.id));
  const smallIds = new Set(sorted.slice(-eliteN).map((x) => x.team.id));

  const weights = scored.map(({ team, s }) => {
    const n = (s - minS) / span;
    let w = 1;
    switch (difficulty) {
      case "easy":
        w = 0.2 + Math.pow(n, 2.2) * 9;
        if (eliteIds.has(team.id)) w *= 3;
        break;
      case "medium":
        w = 0.55 + Math.sin(n * Math.PI) * 0.65;
        break;
      case "hard":
        w = 0.2 + Math.pow(1 - n, 2.1) * 8;
        if (smallIds.has(team.id)) w *= 2.6;
        break;
      case "legendary":
        w = 0.12 + Math.pow(1 - n, 3.3) * 14;
        if (smallIds.has(team.id)) w *= 3.4;
        break;
    }
    return Math.max(w, 0.08);
  });

  let total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < teams.length; i++) {
    r -= weights[i];
    if (r <= 0) return scored[i].team;
  }
  return scored[scored.length - 1].team;
}

function computeBudget(team: Team, difficulty: Difficulty, challengeSlug: string) {
  let base = Math.max(3_000_000, team.reputation * 700_000);
  if (challengeSlug === "moneyball") base *= 0.75;
  if (challengeSlug === "giant_in_crisis") base *= 1.15;
  return Math.round(base * difficultyMultiplier[difficulty]);
}

export function generateObjectives(
  challengeType: ChallengeType,
  team: Team,
  difficulty: Difficulty,
  budget: number,
) {
  const hardFactor = difficulty === "hard" || difficulty === "legendary";
  const leagueTarget =
    team.reputation >= 80
      ? "Top 4"
      : team.reputation >= 70
        ? "Top 6"
        : team.reputation >= 60
          ? "Top 10"
          : "Evitar rebaixamento";

  const objectives: Array<{ type: string; description: string; targetValue?: string }> = [
    {
      type: "league",
      description: `Terminar a liga em ${leagueTarget}.`,
      targetValue: leagueTarget,
    },
    {
      type: "cup",
      description:
        team.reputation >= 75 ? "Chegar pelo menos na semifinal da copa." : "Chegar pelo menos nas quartas da copa.",
    },
    {
      type: "finance",
      description:
        budget > 30_000_000 ? "Fechar a temporada com saldo positivo." : "Reduzir folha salarial em pelo menos 10%.",
    },
  ];

  if (challengeType.slug === "youth_academy" || challengeType.slug === "road_to_glory") {
    objectives.push({
      type: "youth",
      description: "Promover e utilizar ao menos 2 jogadores sub-21 como titulares em 15 jogos.",
    });
  } else {
    objectives.push({
      type: "transfers",
      description: hardFactor ? "Realizar no maximo 3 contratacoes por janela." : "Realizar no maximo 5 contratacoes por janela.",
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
    "Contratar apenas jogadores com ate 24 anos.",
    "No maximo 3 contratacoes por janela.",
    "Usar pelo menos 2 jogadores da base.",
    "Nao contratar jogadores acima de 82 de overall.",
    "Nao contratar jogadores de rival direto da liga.",
    "Priorizar atletas da mesma nacionalidade da liga.",
    "Vender qualquer jogador com proposta superior a 150% do valor de mercado.",
    "Reduzir media de idade do elenco em 1.5 anos.",
  ];

  const selected = new Set<string>();
  if (challengeType.slug === "moneyball" || budget < 25_000_000) {
    selected.add("Limite de folha salarial mensal: 85% do valor atual.");
  }
  if (challengeType.slug === "youth_academy") {
    selected.add("Obrigatorio iniciar cada partida com no minimo 2 jogadores sub-21.");
  }
  if (difficulty === "legendary" || difficulty === "hard") {
    selected.add("No maximo 3 contratacoes por janela.");
  }
  if (team.reputation >= 80) {
    selected.add("Obrigatorio classificar para competicao europeia em ate 2 temporadas.");
  }

  while (selected.size < Math.min(5, Math.max(2, 2 + Math.floor(Math.random() * 3)))) {
    selected.add(pickRandom(pool));
  }

  return Array.from(selected).slice(0, 5);
}

export function generateNarrative(challengeType: ChallengeType, team: Team, difficulty: Difficulty) {
  const tone =
    difficulty === "legendary"
      ? "A pressao e total e cada decisao de mercado precisa ser cirurgica."
      : "A diretoria quer evolucao imediata com consistencia ao longo da temporada.";

  return `O ${team.name} inicia um projeto de ${challengeType.name.toLowerCase()} em busca de estabilidade e resultados. ${tone} O foco sera montar um elenco competitivo sem abrir mao da identidade do clube e cumprir metas esportivas e financeiras realistas.`;
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

export async function cloneTeamPlayersToCareer(careerId: number, teamId: number) {
  const players = await prisma.player.findMany({ where: { teamId } });
  if (!players.length) return;

  await prisma.careerPlayer.createMany({
    data: players.map((p, idx) => ({
      careerId,
      playerId: p.id,
      teamId,
      overallAtual: p.overall,
      valorAtual: p.value,
      salarioAtual: p.wage,
      status: idx < 11 ? "STARTER" : "RESERVE",
      isTitular: idx < 11,
    })),
    skipDuplicates: true,
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

    const players = await tx.player.findMany({ where: { teamId: selectedTeam.id } });
    if (players.length) {
      await tx.careerPlayer.createMany({
        data: players.map((p, idx) => ({
          careerId: created.id,
          playerId: p.id,
          teamId: selectedTeam.id,
          overallAtual: p.overall,
          valorAtual: p.value,
          salarioAtual: p.wage,
          status: idx < 11 ? "STARTER" : "RESERVE",
          isTitular: idx < 11,
        })),
        skipDuplicates: true,
      });
    }

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
