import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Resolve cell value tolerating Kaggle / Sofifa / Python-style header names. */
function pick(row: Record<string, unknown>, candidates: string[]): string {
  for (const c of candidates) {
    const v = row[c];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  const keys = Object.keys(row);
  for (const c of candidates) {
    const key = keys.find((k) => k.trim().toLowerCase() === c.trim().toLowerCase());
    if (key) {
      const v = row[key];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

function parseEuroInt(raw: string): number {
  const n = Number(String(raw).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function resolveCsvPath(): string {
  const fromArg = process.argv[2];
  if (fromArg) {
    const p = path.isAbsolute(fromArg) ? fromArg : path.join(process.cwd(), fromArg);
    if (fs.existsSync(p)) return p;
    throw new Error(`Arquivo nao encontrado: ${p}`);
  }
  const fromEnv = process.env.FIFA_CSV;
  if (fromEnv) {
    const p = path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
    if (fs.existsSync(p)) return p;
    throw new Error(`FIFA_CSV nao encontrado: ${p}`);
  }
  const candidates = [
    path.join(process.cwd(), "data", "players.csv"),
    path.join(process.cwd(), "data", "Fifa 23 Players Data.csv"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Nenhum CSV encontrado. Coloque em data/players.csv ou data/Fifa 23 Players Data.csv, ou passe o caminho: npm run import:fifa23 -- <arquivo.csv>`,
  );
}

async function main() {
  const filePath = resolveCsvPath();
  console.log(`Arquivo: ${filePath}`);

  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  console.log(`Total de linhas: ${rows.length}`);
  let processed = 0;

  for (const row of rows) {
    const teamName = pick(row, ["club_name", "Club Name", "club name"]);
    const finalTeamName = teamName || "Sem clube";
    const leagueName = pick(row, [
      "league_name",
      "League Name",
      "league",
      "League",
      "club_league_name",
    ]);
    const league = leagueName || null;

    const team = await prisma.team.upsert({
      where: { name: finalTeamName },
      update: {
        ...(league != null ? { league } : {}),
      },
      create: {
        name: finalTeamName,
        league,
        country: "Unknown",
      },
    });

    const playerName =
      pick(row, ["long_name", "Full Name", "full_name"]) ||
      pick(row, ["short_name", "Known As"]) ||
      "Unknown";

    const positionRaw =
      pick(row, ["player_positions", "Positions Played", "Best Position"]) || "N/A";
    const position = positionRaw.split(/[,|]/)[0]?.trim() || "N/A";

    const age = Number(pick(row, ["age", "Age"])) || 18;
    const overall = Number(pick(row, ["overall", "Overall"])) || 50;
    const potential = Number(pick(row, ["potential", "Potential"])) || overall;

    const nationality =
      pick(row, ["nationality_name", "Nationality", "nationality"]) || "Unknown";

    const value = parseEuroInt(pick(row, ["value_eur", "Value(in Euro)", "Value"]));
    const wage = parseEuroInt(pick(row, ["wage_eur", "Wage(in Euro)", "Wage"]));

    const existing = await prisma.player.findFirst({
      where: { name: playerName, teamId: team.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: {
          age,
          position,
          overall,
          potential,
          nationality,
          value,
          wage,
        },
      });
    } else {
      await prisma.player.create({
        data: {
          name: playerName,
          age,
          position,
          overall,
          potential,
          nationality,
          value,
          wage,
          teamId: team.id,
        },
      });
    }

    processed += 1;
    if (processed % 500 === 0) {
      console.log(`Processados ${processed}/${rows.length} jogadores...`);
    }
  }

  console.log(`Importacao finalizada. Jogadores processados: ${processed}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Erro na importacao:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
