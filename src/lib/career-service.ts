import { prisma } from "@/lib/prisma";

type GenerateCareerInput = {
  userId: number;
  name: string;
  teamId: number;
  budget: number;
  difficulty: string;
  mainObjective: string;
  formation: string;
  tacticalStyle: string;
  season?: number;
};

export async function generateCareer(input: GenerateCareerInput) {
  const season = input.season ?? 1;

  const career = await prisma.$transaction(async (tx) => {
    const created = await tx.career.create({
      data: {
        userId: input.userId,
        name: input.name,
        teamId: input.teamId,
        season,
        budget: input.budget,
        difficulty: input.difficulty,
        mainObjective: input.mainObjective,
        tacticalStyle: input.tacticalStyle,
        formation: input.formation,
      },
    });

    const players = await tx.player.findMany({ where: { teamId: input.teamId } });
    if (players.length) {
      await tx.careerPlayer.createMany({
        data: players.map((player, index) => ({
          careerId: created.id,
          playerId: player.id,
          teamId: input.teamId,
          overallAtual: player.overall,
          valorAtual: player.value,
          salarioAtual: player.wage,
          status: index < 11 ? "STARTER" : "RESERVE",
          isTitular: index < 11,
        })),
      });
    }

    await tx.tactic.create({
      data: {
        careerId: created.id,
        formation: input.formation,
        style: input.tacticalStyle,
        width: 50,
        depth: 50,
      },
    });

    return created;
  });

  return prisma.career.findUnique({
    where: { id: career.id },
    include: { team: true, players: true, tactic: true },
  });
}
