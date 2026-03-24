# Dataset FIFA 23

Coloque o CSV dos jogadores em `data/`, por exemplo:

- `data/players.csv` (Kaggle com colunas `club_name`, `league_name`, etc.)
- ou `data/Fifa 23 Players Data.csv` (export estilo Sofifa com `Club Name`, etc.)

O script detecta automaticamente um desses arquivos. Também pode informar o caminho:

```bash
npm run import:fifa23 -- "data/Fifa 23 Players Data.csv"
```

Ou variável de ambiente:

```bash
set FIFA_CSV=data\players.csv
npm run import:fifa23
```

## O que o import faz

- **Times**: `club_name` / `Club Name` → nome único do time; **upsert por nome** (sem duplicar).
- **Liga**: `league_name` / `League Name` / variantes → campo `league` no `Team` (pode ficar `null` se a coluna não existir no arquivo).
- **Jogadores**: mapeamento compatível com Kaggle e com o CSV local; **associados ao `teamId`** correto após o upsert do clube.

Depois do import:

```bash
npm run prisma:seed
```

(apenas tipos de desafio; elenco vem do CSV.)
