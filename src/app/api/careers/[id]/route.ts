import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  season: z.number().int().positive().optional(),
  budget: z.number().int().nonnegative().optional(),
  difficulty: z.string().min(2).optional(),
  mainObjective: z.string().min(3).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;

  const career = await prisma.career.findFirst({
    where: { id: Number(id), userId: user.userId },
    include: {
      team: true,
      challengeType: true,
      objectives: true,
      restrictions: true,
      narrative: true,
      tactic: true,
    },
  });

  if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });
  return NextResponse.json(career);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;

  try {
    const body = updateSchema.parse(await req.json());
    const career = await prisma.career.findFirst({
      where: { id: Number(id), userId: user.userId },
    });
    if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });
    const updated = await prisma.career.update({ where: { id: career.id }, data: body });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;

  const career = await prisma.career.findFirst({
    where: { id: Number(id), userId: user.userId },
  });
  if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });

  await prisma.career.delete({ where: { id: career.id } });
  return NextResponse.json({ ok: true });
}
