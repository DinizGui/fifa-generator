import { PageHeader } from "@/components/page-header";
import { PlayersCatalog } from "@/components/players-catalog";

export default function PlayersPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Base de jogadores"
        description="Consulta o dataset importado: overall atual (OVR), potencial máximo (POT), margem de crescimento, clube e valor. Usa filtros e ordenação para explorar ~18k jogadores do FIFA 23."
      />
      <PlayersCatalog />
    </main>
  );
}
