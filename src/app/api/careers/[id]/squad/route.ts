import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const { id } = await params;
  const career = await prisma.career.findFirst({
    where: { id: Number(id), userId: user.userId },
  });

  if (!career) {
    return NextResponse.json({ error: "Carreira nao encontrada." }, { status: 404 });
  }

  const squad = await prisma.careerPlayer.findMany({
    where: { careerId: career.id },
    include: { player: true, team: true },
    orderBy: [{ isTitular: "desc" }, { overallAtual: "desc" }],
  });

  return NextResponse.json(squad);
}
