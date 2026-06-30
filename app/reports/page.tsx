import { AppShell } from "@/components/AppShell";
import { ReportsPageContent } from "@/components/ReportsPageContent";
import { loadDomainConfig, resolveDomainSlug } from "@/lib/config-loader";
import { getDomainMeta, getPendingProposalsCount } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const slug = resolveDomainSlug();
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const pendingProposals = await getPendingProposalsCount(domain.id);

  return (
    <AppShell active="reports" pendingProposals={pendingProposals}>
      <ReportsPageContent domainSlug={slug} domainName={config.name} />
    </AppShell>
  );
}
