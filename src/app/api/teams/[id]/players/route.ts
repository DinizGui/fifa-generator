import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) {
    return NextResponse.json({ error: "Id invalido." }, { status: 400 });
  }

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { overall: "desc" },
  });

  return NextResponse.json(players);
}
