"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const url = isRegister ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha de autenticação");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <div className="relative flex flex-1 flex-col justify-center border-b border-white/5 px-6 py-12 lg:border-b-0 lg:border-r lg:py-16 lg:pl-10 lg:pr-8 xl:pl-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 30% 40%, oklch(0.45 0.15 145 / 0.25), transparent 50%), radial-gradient(circle at 80% 60%, oklch(0.35 0.12 260 / 0.3), transparent 45%)",
          }}
        />
        <div className="relative max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--fifa-accent)]/30 bg-[var(--fifa-accent)]/10 px-3 py-1 text-xs font-medium text-[var(--fifa-accent)]">
            Modo carreira FIFA 23
          </div>
          <h2 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Seu companion para conquistar o save.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            Gerencie orçamento, elenco e transferências enquanto joga. Tudo fiado na base real de jogadores
            e clubes — sem inventar cartas.
          </p>
          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "Elenco sincronizado com o clube",
              "Histórico de compras e vendas",
              "Metas e desafios por carreira",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-[var(--fifa-accent)] shadow-[0_0_8px_var(--fifa-glow)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Card className="relative w-full max-w-md border-white/10 bg-card/80 shadow-[0_0_0_1px_oklch(1_0_0_/_6%),0_25px_50px_-12px_oklch(0_0_0_/_0.5)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[var(--fifa-accent)]/60 to-transparent" />
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="font-heading text-2xl text-white">
              {isRegister ? "Criar conta" : "Entrar"}
            </CardTitle>
            <CardDescription>
              {isRegister
                ? "Use um e-mail válido para guardar suas carreiras na nuvem."
                : "Acesse seu painel e continue de onde parou."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-2">
            {isRegister ? (
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-muted-foreground">
                  Nome
                </Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    className="pl-10"
                    placeholder="Como você quer ser chamado"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-muted-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
              </div>
            </div>
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              size="lg"
              className="mt-2 w-full gap-2 font-heading tracking-wide uppercase"
              disabled={loading}
              onClick={submit}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isRegister ? "Registrar" : "Entrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIsRegister((v) => !v);
                setError("");
              }}
            >
              {isRegister ? "Já tenho conta — entrar" : "Criar nova conta"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
