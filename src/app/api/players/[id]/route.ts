import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const num = Number(id);
  if (!Number.isFinite(num) || num < 1) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id: num },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          league: true,
          country: true,
          reputation: true,
        },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Jogador nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(player);
}
