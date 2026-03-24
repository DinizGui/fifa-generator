import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChallenges } from "@/lib/challenge-pool/generate";
import { requireUser } from "@/lib/http";

const bodySchema = z.object({
  count: z.coerce.number().int().min(1).max(500).optional().default(200),
  bias: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });

  try {
    const json = await req.json().catch(() => ({}));
    const body = bodySchema.parse(json);
    const result = await generateChallenges(body.count, { bias: body.bias });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar desafios.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
