import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const position = searchParams.get("position") ?? "";
  const minOverall = Number(searchParams.get("minOverall") ?? "0");
  const maxAge = Number(searchParams.get("maxAge") ?? "99");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? "20")));

  const where = {
    name: { contains: q },
    position: position ? { equals: position } : undefined,
    overall: { gte: minOverall },
    age: { lte: maxAge },
  };

  const [items, total] = await Promise.all([
    prisma.player.findMany({
      where,
      include: { team: true },
      orderBy: { overall: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
