import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SORT_FIELDS = ["overall", "potential", "value", "wage", "age", "name"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSort(raw: string | null): SortField {
  if (raw && SORT_FIELDS.includes(raw as SortField)) return raw as SortField;
  return "overall";
}

/** Ordem por defeito: melhores primeiro; nome e idade mais legíveis em asc. */
function defaultOrderForSort(sort: SortField): "asc" | "desc" {
  if (sort === "name" || sort === "age") return "asc";
  return "desc";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const position = searchParams.get("position")?.trim() ?? "";
  const minOverall = Math.max(0, Math.min(99, Number(searchParams.get("minOverall") ?? "0")));
  const minPotential = Math.max(0, Math.min(99, Number(searchParams.get("minPotential") ?? "0")));
  const maxAge = Math.max(16, Math.min(55, Number(searchParams.get("maxAge") ?? "55")));
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? "25")));

  const sort = parseSort(searchParams.get("sort"));
  const orderParam = searchParams.get("order");
  const order: "asc" | "desc" =
    orderParam === "asc" || orderParam === "desc" ? orderParam : defaultOrderForSort(sort);

  const teamIdRaw = searchParams.get("teamId");
  const teamIdNum = teamIdRaw ? Number(teamIdRaw) : NaN;
  const teamId = Number.isFinite(teamIdNum) && teamIdNum > 0 ? teamIdNum : undefined;

  const where = {
    ...(q ? { name: { contains: q } } : {}),
    ...(position ? { position: { equals: position } } : {}),
    overall: { gte: minOverall },
    potential: { gte: minPotential },
    age: { lte: maxAge },
    ...(teamId != null ? { teamId } : {}),
  };

  const orderBy = { [sort]: order } as Record<SortField, "asc" | "desc">;

  const [items, total, aggregates, topPotentials] = await Promise.all([
    prisma.player.findMany({
      where,
      include: { team: { select: { id: true, name: true, league: true, country: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.player.count({ where }),
    prisma.player.aggregate({
      _count: { _all: true },
      _max: { overall: true, potential: true },
      _avg: { overall: true, potential: true },
    }),
    prisma.player.findMany({
      select: {
        id: true,
        name: true,
        overall: true,
        potential: true,
        position: true,
        age: true,
        team: { select: { name: true } },
      },
      orderBy: { potential: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
    sort,
    order,
    summary: {
      totalInDb: aggregates._count._all,
      maxOverall: aggregates._max.overall ?? 0,
      maxPotential: aggregates._max.potential ?? 0,
      avgOverall: aggregates._avg.overall != null ? Math.round(aggregates._avg.overall * 10) / 10 : null,
      avgPotential: aggregates._avg.potential != null ? Math.round(aggregates._avg.potential * 10) / 10 : null,
      topByPotential: topPotentials,
    },
  });
}
