import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

const schema = z.object({
  formation: z.string().min(3),
  style: z.string().min(3),
  width: z.number().int().min(1).max(100),
  depth: z.number().int().min(1).max(100),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;
  const career = await prisma.career.findFirst({ where: { id: Number(id), userId: user.userId } });
  if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });
  const tactic = await prisma.tactic.findUnique({ where: { careerId: career.id } });
  return NextResponse.json(tactic);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const { id } = await params;

  try {
    const body = schema.parse(await req.json());
    const career = await prisma.career.findFirst({ where: { id: Number(id), userId: user.userId } });
    if (!career) return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });

    const tactic = await prisma.tactic.upsert({
      where: { careerId: career.id },
      create: { careerId: career.id, ...body },
      update: body,
    });
    return NextResponse.json(tactic);
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }
}
