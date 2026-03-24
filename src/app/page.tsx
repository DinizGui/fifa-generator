import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth";

export default async function Home() {
  const session = await getSessionPayload();
  if (session) {
    redirect("/dashboard");
  }
  redirect("/login");
}
