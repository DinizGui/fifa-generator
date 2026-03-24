import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await getSessionPayload();
  if (!session) return null;

  const userId = Number(session.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    await clearSessionCookie();
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    await clearSessionCookie();
    return null;
  }

  return { userId: user.id, email: user.email, name: user.name };
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
