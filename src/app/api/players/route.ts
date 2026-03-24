import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const position = searchParams.get("position") ?? "";
  const maxAge = Number(searchParams.get("maxAge") ?? "99");
  const minOverall = Number(searchParams.get("minOverall") ?? "0");

  const players = await prisma.player.findMany({
    where: {
      name: { contains: name },
      position: position ? { equals: position } : undefined,
      age: { lte: maxAge },
      overall: { gte: minOverall },
    },
    include: { team: true },
    take: 100,
    orderBy: { overall: "desc" },
  });

  return NextResponse.json(players);
}
