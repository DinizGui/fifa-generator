import { redirect } from "next/navigation";
import { CareerGeneratorForm } from "@/components/career-generator-form";
import { PageHeader } from "@/components/page-header";
import { getSessionPayload } from "@/lib/auth";

export default async function CareerGeneratePage() {
  const session = await getSessionPayload();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Gerar nova carreira"
        description="Um clube qualquer do mundo será sorteado do seu banco de dados. Em Fácil, gigantes aparecem com mais frequência; em Difícil ou Lendário, times menores ganham peso."
      />
      <CareerGeneratorForm />
    </main>
  );
}
