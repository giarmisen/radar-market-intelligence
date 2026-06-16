import { AppShell } from "@/components/AppShell";
import { MarketPulsePage } from "@/components/MarketPulsePage";
import { getLivingDocumentData } from "@/lib/living-document";

export const dynamic = "force-dynamic";

export default async function LivingDocumentPage() {
  const data = await getLivingDocumentData();

  return (
    <AppShell active="living" pendingProposals={data.pendingProposals}>
      <MarketPulsePage data={data} />
    </AppShell>
  );
}
