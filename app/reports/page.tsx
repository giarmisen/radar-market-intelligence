import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { QuarterlyReviewPanel } from "@/components/QuarterlyReviewPanel";
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
      <PageTopbar
        title="Market Report"
        subtitle="Generate an on-demand analyst briefing from signals in any date range."
        meta={config.name}
      />
      <div className="radar-content">
        <QuarterlyReviewPanel domainSlug={slug} domainName={config.name} />
      </div>
    </AppShell>
  );
}
