import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = querySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      difficulty: searchParams.get("difficulty") ?? undefined,
    });

    const where = q.difficulty ? { difficulty: q.difficulty } : {};

    const [items, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: q.limit,
        skip: q.offset,
        include: {
          team: { select: { id: true, name: true, league: true, country: true } },
          player: { select: { id: true, name: true, position: true, overall: true } },
        },
      }),
      prisma.challenge.count({ where }),
    ]);

    return NextResponse.json({ items, total, limit: q.limit, offset: q.offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar desafios.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
