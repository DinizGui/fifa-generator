/**
 * Importação FIFA 23 → Prisma/MySQL usando csv-parser (stream).
 *
 * Ordem obrigatória:
 *   npx prisma db push && npx prisma generate
 *   npm run import
 *
 * Uso: npx tsx scripts/import.ts [caminho.csv]
 * NÃO use: npx ts-node scripts/import.ts (falha ao resolver o ficheiro).
 * Use: npm run import:ts-node
 *
 * Procura por omissão: data/players.csv → data/Fifa 23 Players Data.csv
 *
 * Retomar após paragem: use o último índice visto no log (ex. jogador 8000/18539):
 *   PowerShell: $env:IMPORT_SKIP_PLAYERS="8000"; npm run import:ts-node
 * Recomeçar do zero: não defina IMPORT_SKIP_PLAYERS (ou "").
 */
import "dotenv/config";
import fs from "node:fs";
import { createReadStream } from "node:fs";
import path from "path";
import csv from "csv-parser";
import { PrismaClient } from "@prisma/client";
import { importFifaPlayerRows, resolveCsvPath } from "./fifa-import-core";

/** Tipagem fraca: csv-parser devolve Record<string, string> */
type CsvRow = Record<string, string>;

function readCsvWithParser(filePath: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];
    const stream = createReadStream(filePath, { encoding: "utf-8" });

    stream.on("error", reject);

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => String(header).trim(),
          mapValues: ({ value }) => (value == null ? "" : String(value).trim()),
        }),
      )
      .on("data", (row: CsvRow) => {
        rows.push(row as Record<string, unknown>);
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function main() {
  const filePath = resolveCsvPath();
  console.log(`CSV: ${path.relative(process.cwd(), filePath)}`);

  const rows = await readCsvWithParser(filePath);
  console.log(`Linhas lidas: ${rows.length}`);

  if (rows.length === 0) {
    console.error("Ficheiro vazio ou sem dados.");
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ["error", "warn"] });
  try {
    const n = await importFifaPlayerRows(prisma, rows);
    console.log(`Importacao finalizada — jogadores processados: ${n}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Erro na importacao:", e);
  process.exit(1);
});
