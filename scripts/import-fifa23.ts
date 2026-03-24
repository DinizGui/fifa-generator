/**
 * @deprecated Em alternativa use `npm run import` (scripts/import.ts + csv-parser).
 * Mantido para compatibilidade: usa csv-parse/sync + mesmo núcleo de upsert.
 */
import "dotenv/config";
import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { importFifaPlayerRows, resolveCsvPath } from "./fifa-import-core";

const prisma = new PrismaClient();

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
  const processed = await importFifaPlayerRows(prisma, rows);
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
