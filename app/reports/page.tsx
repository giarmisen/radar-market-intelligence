import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { QuarterlyReviewPanel } from "@/components/QuarterlyReviewPanel";
import { loadDomainConfig, resolveDomainSlug } from "@/lib/config-loader";
import { getDomainMeta, getPendingProposalsCount } from "@/lib/domain";
import { defaultReportDateRange } from "@/lib/report-date-range";
import { fetchReportSignals } from "@/lib/quarterly-review";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const slug = resolveDomainSlug();
  const config = loadDomainConfig(slug);
  const domain = await getDomainMeta(slug);
  const pendingProposals = await getPendingProposalsCount(domain.id);
  const { from, to } = defaultReportDateRange();
  const defaultRangeSignals = await fetchReportSignals(slug, from, to);

  return (
    <>
      <Nav active="reports" pendingProposals={pendingProposals} />
      <Hero
        eyebrow={config.name}
        title="Market Report"
        sub="Generate an on-demand analyst briefing from signals in any date range."
        stats={[
          { value: defaultRangeSignals.length, label: "Signals (90 days)" },
          { value: config.actors.length, label: "Tracked actors" },
          { value: 6, label: "Report sections" },
        ]}
      />
      <main className="radar-page-main">
        <QuarterlyReviewPanel domainSlug={slug} domainName={config.name} />
      </main>
    </>
  );
}
