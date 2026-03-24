import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

const updateSchema = z.object({
  careerId: z.number().int().positive(),
  careerPlayerId: z.number().int().positive(),
  overallAtual: z.number().int().min(1).max(99).optional(),
  status: z.enum(["STARTER", "RESERVE", "LOANED", "SOLD", "FREE_AGENT"]).optional(),
  isTitular: z.boolean().optional(),
});

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const careerId = Number(searchParams.get("careerId") ?? "0");

  const career = await prisma.career.findFirst({
    where: { id: careerId, userId: user.userId },
    include: {
      players: {
        include: { player: true, team: true },
        orderBy: [{ isTitular: "desc" }, { overallAtual: "desc" }],
      },
    },
  });

  if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });
  return NextResponse.json(career.players);
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  try {
    const body = updateSchema.parse(await req.json());
    const career = await prisma.career.findFirst({
      where: { id: body.careerId, userId: user.userId },
    });
    if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });

    const updated = await prisma.careerPlayer.update({
      where: { id: body.careerPlayerId },
      data: {
        overallAtual: body.overallAtual,
        status: body.status,
        isTitular: body.isTitular,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }
}
