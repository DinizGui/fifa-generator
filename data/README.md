# Dataset FIFA 23

Coloque o CSV na pasta `data/`:

| Ficheiro | Descrição |
|----------|-----------|
| **`players.csv`** | Preferido (Kaggle / export próprio com `club_name`, `sofifa_id`, …) |
| **`Fifa 23 Players Data.csv`** | Export estilo Sofifa (`Club Name`, `Image Link`, …) |

## Antes de importar (obrigatório)

O MySQL tem de ter as tabelas criadas pelo Prisma:

```bash
npx prisma db push
npx prisma generate
```

Se saltares este passo, verás: **`The table Team does not exist`**.

## Comandos

```bash
# Recomendado (csv-parser + stream)
npm run import

# Legado (csv-parse em memória)
npm run import:fifa23

# Com ts-node (usa scripts/tsconfig.json CommonJS)
npm run import:ts-node

# Caminho manual
npx tsx scripts/import.ts "C:/caminho/para/o.csv"
```

Variável opcional: `FIFA_CSV=caminho.csv`

## Após importar

```bash
npx prisma generate
npm run prisma:seed
```

O **seed** só popula `ChallengeType` + catálogo `Challenge` (se a tabela existir). Elenco vem **só** do CSV.

## Importação

- **Team**: upsert por `name`; `country` (coluna de clube ou `Unknown`).
- **Player**: upsert por **`sofifaId`** (coluna `sofifa_id` / `ID` ou URL em **Image Link**); fallback nome+clube sem ID na URL.
