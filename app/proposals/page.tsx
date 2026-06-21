import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { ProposalsQueue } from "@/components/ProposalsQueue";
import { StatGrid } from "@/components/StatGrid";
import { getProposalsPageData } from "@/lib/proposals-page";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const data = await getProposalsPageData();

  return (
    <AppShell active="proposals" pendingProposals={data.pendingProposals}>
      <PageTopbar
        title="Proposals"
        subtitle="Curation queue — review system-generated proposals and approve or reject changes."
      />
      <div className="radar-content">
        <StatGrid
          stats={[
            { value: data.stats.pending, label: "Pending proposals" },
            { value: data.stats.evidence, label: "Evidence signals" },
            {
              value: new Set(data.proposals.map((p) => p.type)).size,
              label: "Proposal types",
            },
            { value: data.proposals.length, label: "Total in queue" },
          ]}
        />
        <ProposalsQueue proposals={data.proposals} />
      </div>
    </AppShell>
  );
}
