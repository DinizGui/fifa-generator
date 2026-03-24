import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth";

export async function requireSessionOrRedirect() {
  const session = await getSessionPayload();
  if (!session) {
    redirect("/login");
  }
  return session;
}
