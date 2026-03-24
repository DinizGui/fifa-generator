import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedChallengeTypes() {
  const challenges = [
    { slug: "reconstruction", name: "Reconstrucao", description: "Remontar elenco e identidade do clube." },
    { slug: "road_to_glory", name: "Road to Glory", description: "Levar clube pequeno ao topo." },
    { slug: "giant_in_crisis", name: "Gigante em crise", description: "Recuperar um time tradicional." },
    { slug: "moneyball", name: "Moneyball", description: "Competir com baixo investimento e analise de mercado." },
    { slug: "youth_academy", name: "Base/Jovens", description: "Projeto focado em jovens talentos." },
    { slug: "realistic_career", name: "Carreira realista", description: "Progresso equilibrado e plausivel." },
    { slug: "save_small_club", name: "Salvar time pequeno", description: "Evitar queda e consolidar crescimento." },
    { slug: "european_project", name: "Projeto europeu", description: "Classificar e competir na Europa." },
  ];

  for (const challenge of challenges) {
    await prisma.challengeType.upsert({
      where: { slug: challenge.slug },
      create: challenge,
      update: challenge,
    });
  }
  console.log("Seed: ChallengeType OK.");
}

async function seedPresetChallenges() {
  try {
    const { PRESET_CHALLENGE_INPUTS } = await import("../src/lib/challenge-pool/preset-challenges-data");
    const { presetToDbPayload } = await import("../src/lib/challenge-pool/preset-challenges");
    let presetsUpserted = 0;
    for (const preset of PRESET_CHALLENGE_INPUTS) {
      const row = presetToDbPayload(preset);
      await prisma.challenge.upsert({
        where: { signature: row.signature },
        create: row,
        update: {
          name: row.name,
          difficulty: row.difficulty,
          types: row.types,
          narrative: row.narrative,
          objectives: row.objectives,
          restrictions: row.restrictions,
          tactics: row.tactics,
          teamId: null,
          playerId: null,
        },
      });
      presetsUpserted++;
    }
    console.log(`Seed: Challenge (catalogo) OK — ${presetsUpserted} presets.`);
  } catch (e) {
    console.warn(
      "Seed: catalogo Challenge ignorado (tabela inexistente ou erro). Rode prisma db push. Detalhe:",
      e instanceof Error ? e.message : e,
    );
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao definida. Configure .env na raiz do projeto.");
  }

  await seedChallengeTypes();
  await seedPresetChallenges();

  console.log("Seed concluido. Elenco: npm run import");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed falhou:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
