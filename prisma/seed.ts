import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  console.log("Seed: ChallengeType concluido. Times e jogadores vêm do CSV (npm run import:fifa23).");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
