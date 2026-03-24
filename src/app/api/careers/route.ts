import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http";

const createCareerSchema = z.object({
  name: z.string().min(2),
  teamId: z.number().int().positive(),
  season: z.number().int().positive().default(1),
  budget: z.number().int().nonnegative(),
  difficulty: z.string().min(2),
  mainObjective: z.string().min(3),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  const careers = await prisma.career.findMany({
    where: { userId: user.userId },
    include: {
      team: true,
      challengeType: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(careers);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  try {
    const body = createCareerSchema.parse(await req.json());
    const career = await prisma.career.create({
      data: {
        userId: user.userId,
        name: body.name,
        teamId: body.teamId,
        season: body.season,
        budget: body.budget,
        difficulty: body.difficulty,
        mainObjective: body.mainObjective,
      },
    });

    return NextResponse.json(career, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }
}
