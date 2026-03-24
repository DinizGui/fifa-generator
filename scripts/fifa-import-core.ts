/**
 * Lógica partilhada: normalização de colunas CSV (Kaggle / Sofifa) + upsert Team/Player.
 * Usado por `import.ts` (csv-parser) e `import-fifa23.ts` (csv-parse sync).
 */
import type { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { assertPrismaTablesExist, isMissingSchemaError } from "./prisma-db-check";

export function pick(row: Record<string, unknown>, candidates: string[]): string {
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

export function parseEuroInt(raw: string): number {
  const n = Number(String(raw).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Coluna numérica explícita (Kaggle): sofifa_id, ID, player_id, etc. */
export function sofifaIdFromColumns(row: Record<string, unknown>): number | null {
  const raw = pick(row, ["sofifa_id", "sofifaId", "ID", "player_id", "Player ID"]);
  if (!raw) return null;
  const n = Number(String(raw).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** URL imagem Sofifa: .../players/158/023/... → 158023 */
export function sofifaIdFromImageLink(row: Record<string, unknown>): number | null {
  const link = pick(row, ["Image Link", "image link", "player_url", "photo_url"]);
  if (!link) return null;
  const m = String(link).match(/\/players\/(\d+)\/(\d+)\//);
  if (!m) return null;
  const hi = m[1].replace(/^0+/, "") || "0";
  const lo = m[2];
  const n = Number(`${hi}${lo.padStart(3, "0")}`);
  return Number.isFinite(n) ? n : null;
}

export function resolveSofifaId(row: Record<string, unknown>): number | null {
  return fromColumnsAndImage(row);
}

function fromColumnsAndImage(row: Record<string, unknown>): number | null {
  const fromCol = sofifaIdFromColumns(row);
  if (fromCol != null) return fromCol;
  return sofifaIdFromImageLink(row);
}

/** Alinhado ao `varchar(191)` por defeito do Prisma em MySQL — evita colisão por truncagem no servidor. */
const MAX_TEAM_NAME_CHARS = 191;

function truncateTeamNameChars(s: string): string {
  const cp = [...s];
  if (cp.length <= MAX_TEAM_NAME_CHARS) return s;
  return cp.slice(0, MAX_TEAM_NAME_CHARS).join("").trimEnd() || "Sem clube";
}

/** Nome estável para gravar no DB (espaços, Unicode NFKC). */
export function normalizeTeamName(raw: string): string {
  let s = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!s) s = "Sem clube";
  return truncateTeamNameChars(s);
}

/**
 * Chave para agrupar variantes que o MySQL trata como o mesmo `name` único
 * (índice case-insensitive / collation).
 */
function teamDedupKey(raw: string): string {
  return normalizeTeamName(raw || "Sem clube").toLowerCase();
}

/** Quando o unique no MySQL dispara mas `findFirst({ name })` não encontra (collation / variantes). */
async function findTeamIdCaseInsensitive(prisma: PrismaClient, name: string): Promise<number | null> {
  const cmp = name.trim();
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM Team WHERE LOWER(TRIM(name)) = LOWER(${cmp}) LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/** Usa a mesma comparação que o índice único na coluna `name` (collation da tabela). */
async function findTeamIdByDbName(prisma: PrismaClient, name: string): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM Team WHERE name = ${name} LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

async function resolveOrCreateTeam(prisma: PrismaClient, t: TeamSeed) {
  let id = await findTeamIdByDbName(prisma, t.name);
  if (id == null) id = (await findTeamIdCaseInsensitive(prisma, t.name)) ?? null;

  if (id != null) {
    return prisma.team.update({
      where: { id },
      data: {
        ...(t.league != null ? { league: t.league } : {}),
        country: t.country,
      },
    });
  }

  try {
    return await prisma.team.create({
      data: {
        name: t.name,
        league: t.league,
        country: t.country,
      },
    });
  } catch (e) {
    if (!isPrismaUniqueViolation(e)) throw e;
    let conflictId = await findTeamIdByDbName(prisma, t.name);
    if (conflictId == null) conflictId = (await findTeamIdCaseInsensitive(prisma, t.name)) ?? null;
    if (conflictId == null) throw e;
    return prisma.team.update({
      where: { id: conflictId },
      data: {
        ...(t.league != null ? { league: t.league } : {}),
        country: t.country,
      },
    });
  }
}

export function resolveCsvPath(argvPath?: string): string {
  const fromArg = argvPath ?? process.argv[2];
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
    "Nenhum CSV encontrado. Coloque data/players.csv ou data/Fifa 23 Players Data.csv, ou: npx tsx scripts/import.ts caminho.csv",
  );
}

type TeamSeed = { dedupKey: string; name: string; league: string | null; country: string };

function collectUniqueTeams(rows: Record<string, unknown>[]): TeamSeed[] {
  const map = new Map<string, TeamSeed>();
  for (const row of rows) {
    const teamName = pick(row, ["club_name", "Club Name", "club name"]);
    const canonical = normalizeTeamName(teamName || "Sem clube");
    const dedupKey = canonical.toLowerCase();
    const leagueName = pick(row, [
      "league_name",
      "League Name",
      "league",
      "League",
      "club_league_name",
    ]);
    const league = leagueName || null;
    const country = pick(row, ["club_country", "Club Country", "country_team"]) || "Unknown";
    const prev = map.get(dedupKey);
    if (!prev) {
      map.set(dedupKey, { dedupKey, name: canonical, league, country });
    } else {
      if (league && !prev.league) prev.league = league;
      if (country !== "Unknown" && prev.country === "Unknown") prev.country = country;
      if (canonical.length > prev.name.length) prev.name = canonical;
    }
  }
  return Array.from(map.values());
}

/**
 * Saltar as primeiras N linhas de jogadores do CSV (ordem estável do ficheiro).
 * Ex.: parou em "jogador 5000/18539" → IMPORT_SKIP_PLAYERS=5000
 * Clubes continuam a ser sincronizados a partir de todo o CSV (rápido).
 */
function parseSkipPlayers(): number {
  const raw = process.env.IMPORT_SKIP_PLAYERS;
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** 1 = uma linha por jogador. Defina IMPORT_LOG_EVERY=100 (ou outro N) para agrupar. */
function logPlayerInterval(): number {
  const raw = process.env.IMPORT_LOG_EVERY;
  if (raw === undefined || raw === "") return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Importa todas as linhas já normalizadas como objetos (valores string). */
export async function importFifaPlayerRows(prisma: PrismaClient, rows: Record<string, unknown>[]): Promise<number> {
  console.log("A validar ligacao ao MySQL / tabelas Prisma…");
  await assertPrismaTablesExist(prisma);
  console.log("Schema OK.");

  const teamSeeds = collectUniqueTeams(rows);
  console.log(
    `A sincronizar ${teamSeeds.length} clubes unicos (antes eram ${rows.length} upserts repetidos)…`,
  );
  const teamIdByDedupKey = new Map<string, number>();
  let ti = 0;
  const t0Teams = Date.now();
  for (const t of teamSeeds) {
    const team = await resolveOrCreateTeam(prisma, t);
    teamIdByDedupKey.set(t.dedupKey, team.id);
    ti += 1;
    if (ti % 50 === 0 || ti === teamSeeds.length) {
      console.log(`  clubes ${ti}/${teamSeeds.length} (${Math.round((Date.now() - t0Teams) / 1000)}s)`);
    }
  }
  console.log(`Clubes concluidos em ${Math.round((Date.now() - t0Teams) / 1000)}s.`);

  const skipPlayers = parseSkipPlayers();
  const playerRows =
    skipPlayers > 0 ? rows.slice(skipPlayers) : rows;
  if (skipPlayers > 0) {
    if (skipPlayers >= rows.length) {
      console.warn(
        `IMPORT_SKIP_PLAYERS=${skipPlayers} >= ${rows.length} linhas; fase de jogadores vazia.`,
      );
      return 0;
    }
    console.log(
      `Retomada: IMPORT_SKIP_PLAYERS=${skipPlayers} — a processar linhas ${skipPlayers + 1}–${rows.length} (${playerRows.length} jogadores).`,
    );
  }

  const logEvery = logPlayerInterval();
  console.log(
    logEvery === 1
      ? `A importar ${playerRows.length} jogadores (log linha a linha; IMPORT_LOG_EVERY=N para agrupar)…`
      : `A importar ${playerRows.length} jogadores (progresso a cada ${logEvery} linhas; IMPORT_LOG_EVERY=1 para todas)…`,
  );

  let processed = 0;
  let errors = 0;
  const t0Players = Date.now();

  for (const row of playerRows) {
    try {
      const teamName = pick(row, ["club_name", "Club Name", "club name"]);
      const dedupKey = teamDedupKey(teamName || "Sem clube");
      const teamId = teamIdByDedupKey.get(dedupKey);
      if (teamId == null) {
        throw new Error(`teamId em falta para clube (chave): ${dedupKey}`);
      }

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

      const imgRaw = pick(row, ["Image Link", "image link", "player_url", "photo_url"]);
      const imageUrl =
        imgRaw && /^https?:\/\//i.test(imgRaw.trim()) ? imgRaw.trim().slice(0, 512) : null;

      const hRaw = Number(pick(row, ["Height(in cm)", "height_cm", "height"]));
      const heightCm =
        Number.isFinite(hRaw) && hRaw > 0 && hRaw < 300 ? Math.round(hRaw) : null;
      const wRaw = Number(pick(row, ["Weight(in kg)", "weight_kg", "weight"]));
      const weightKg =
        Number.isFinite(wRaw) && wRaw > 0 && wRaw < 200 ? Math.round(wRaw) : null;

      const sofifaId = resolveSofifaId(row);
      const playerPayload = {
        name: playerName,
        imageUrl,
        heightCm,
        weightKg,
        teamId,
        age,
        position,
        overall,
        potential,
        nationality,
        value,
        wage,
      };

      if (sofifaId != null) {
        await prisma.player.upsert({
          where: { sofifaId },
          create: { ...playerPayload, sofifaId },
          update: playerPayload,
        });
      } else {
        const existing = await prisma.player.findFirst({
          where: { name: playerName, teamId },
          select: { id: true },
        });
        if (existing) {
          await prisma.player.update({
            where: { id: existing.id },
            data: playerPayload,
          });
        } else {
          await prisma.player.create({
            data: playerPayload,
          });
        }
      }

      processed += 1;
      const sec = Math.round((Date.now() - t0Players) / 1000);
      const idx = skipPlayers + processed;
      if (
        logEvery === 1 ||
        processed % logEvery === 0 ||
        processed === playerRows.length
      ) {
        console.log(
          `  jogador ${idx}/${rows.length} ${playerName} | ${teamName || "—"} | OVR ${overall} (${sec}s)`,
        );
      }
    } catch (e) {
      if (isMissingSchemaError(e)) throw e;
      errors += 1;
      const name = pick(row, ["long_name", "Full Name", "Known As"]) || "?";
      if (errors <= 5) {
        console.warn(`  Erro jogador (${name}):`, e instanceof Error ? e.message : e);
      }
    }
  }

  if (errors > 0) {
    console.warn(
      `Importacao terminou com ${errors} erros em linhas (mostrados no max. 5 no log).`,
    );
  }
  console.log(`Jogadores: ${processed} OK em ${Math.round((Date.now() - t0Players) / 1000)}s.`);
  return processed;
}
