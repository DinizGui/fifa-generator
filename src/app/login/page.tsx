import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionPayload();
  if (session) {
    redirect("/dashboard");
  }
  return <LoginForm />;
}
