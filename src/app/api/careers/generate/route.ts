import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/http";
import { generateCareerChallenge } from "@/lib/career-generator";

const schema = z.object({
  name: z.string().min(2),
  difficulty: z.enum(["easy", "medium", "hard", "legendary"]).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    const career = await generateCareerChallenge({
      userId: user.userId,
      name: body.name,
      difficulty: body.difficulty,
    });
    return NextResponse.json(career, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar carreira.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
