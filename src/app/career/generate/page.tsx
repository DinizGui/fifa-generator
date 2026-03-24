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
        description="O clube e o tipo de desafio são sorteados do dataset importado. Em Fácil, o time vem quase sempre dos elencos mais fortes (~top 28% da base), com peso extra para gigantes; em Difícil ou Lendário, clubes menores ganham muito mais peso."
      />
      <CareerGeneratorForm />
    </main>
  );
}
