import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

const schema = z.object({
  careerId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  value: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const career = await prisma.career.findFirst({
      where: { id: body.careerId, userId: user.userId },
    });
    if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });

    const player = await prisma.player.findUnique({ where: { id: body.playerId } });
    if (!player) return NextResponse.json({ error: "Jogador nao encontrado." }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.careerPlayer.upsert({
        where: { careerId_playerId: { careerId: career.id, playerId: player.id } },
        create: {
          careerId: career.id,
          playerId: player.id,
          teamId: career.teamId,
          overallAtual: player.overall,
          valorAtual: body.value || player.value,
          salarioAtual: player.wage,
          status: "RESERVE",
          isTitular: false,
        },
        update: {
          teamId: career.teamId,
          valorAtual: body.value || player.value,
          status: "RESERVE",
          isTitular: false,
        },
      });

      const transfer = await tx.transfer.create({
        data: {
          careerId: career.id,
          playerId: player.id,
          fromTeamId: player.teamId,
          toTeamId: career.teamId,
          value: body.value || player.value,
          date: new Date(),
        },
      });

      return transfer;
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }
}
