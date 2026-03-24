import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

const schema = z.object({
  careerId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  toTeamId: z.number().int().positive().optional(),
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

    const cp = await prisma.careerPlayer.findUnique({
      where: { careerId_playerId: { careerId: career.id, playerId: body.playerId } },
      include: { player: true },
    });

    if (!cp) return NextResponse.json({ error: "Jogador nao esta no elenco." }, { status: 404 });

    const transfer = await prisma.$transaction(async (tx) => {
      await tx.careerPlayer.update({
        where: { id: cp.id },
        data: {
          teamId: body.toTeamId ?? null,
          status: "SOLD",
          isTitular: false,
        },
      });

      return tx.transfer.create({
        data: {
          careerId: career.id,
          playerId: body.playerId,
          fromTeamId: career.teamId,
          toTeamId: body.toTeamId ?? null,
          value: body.value,
          date: new Date(),
        },
      });
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }
}
