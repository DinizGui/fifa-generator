import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth";

export async function requireUser() {
  const session = await getSessionPayload();
  if (!session) return null;
  return session;
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
