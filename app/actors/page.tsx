import { ActorsPageContent } from "@/components/ActorsPageContent";
import { AppShell } from "@/components/AppShell";
import { getActorsPageData } from "@/lib/actors-page";

export const dynamic = "force-dynamic";

export default async function ActorsPage() {
  const data = await getActorsPageData();

  return (
    <AppShell active="actors" pendingProposals={data.pendingProposals}>
      <ActorsPageContent data={data} />
    </AppShell>
  );
}
