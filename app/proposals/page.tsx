import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { ProposalsEmptyState } from "@/components/ProposalsEmptyState";
import { ProposalsQueue } from "@/components/ProposalsQueue";
import { getProposalsPageData } from "@/lib/proposals-page";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const data = await getProposalsPageData();
  const isEmpty = data.proposals.length === 0;

  return (
    <AppShell active="proposals" pendingProposals={data.pendingProposals}>
      <PageTopbar
        title="Proposals"
        subtitle="Curation queue: review system-generated proposals and approve or reject changes."
      />
      <div className="radar-content">
        {isEmpty ? (
          <ProposalsEmptyState resolvedProposals={data.resolvedProposals} />
        ) : (
          <ProposalsQueue
            proposals={data.proposals}
            resolvedProposals={data.resolvedProposals}
          />
        )}
      </div>
    </AppShell>
  );
}
