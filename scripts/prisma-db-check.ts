import type { PrismaClient } from "@prisma/client";

/** Erro de tabela/schema antes de processar milhares de linhas do CSV. */
export function isMissingSchemaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  if (/does not exist/i.test(msg) && /table/i.test(msg)) return true;
  if (/Unknown table/i.test(msg)) return true;
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: string }).code;
    if (code === "P2021") return true;
  }
  return false;
}

/**
 * Garante que o MySQL já recebeu `prisma db push` (tabelas Team, Player, …).
 */
export async function assertPrismaTablesExist(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.team.findFirst({ take: 1 });
  } catch (e) {
    if (isMissingSchemaError(e)) {
      throw new Error(
        [
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          "  Base de dados sem tabelas Prisma (ex.: `Team`).",
          "",
          "  1) Confirme DATABASE_URL no .env (Railway / MySQL).",
          "  2) Na pasta do projeto FIFA:",
          "       npx prisma db push",
          "       npx prisma generate",
          "  3) Depois:",
          "       npm run import",
          "",
          "  ts-node: use  npm run import:ts-node  (não: npx ts-node scripts/import.ts)",
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        ].join("\n"),
      );
    }
    throw e;
  }
}
