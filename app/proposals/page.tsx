import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { ProposalsQueue } from "@/components/ProposalsQueue";
import { getProposalsPageData } from "@/lib/proposals-page";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const data = await getProposalsPageData();

  return (
    <>
      <Nav active="proposals" pendingProposals={data.pendingProposals} />
      <Hero
        eyebrow={data.domainName}
        title="Proposals"
        sub="Curation queue — review system-generated proposals and approve or reject changes to actors and sources."
        stats={[
          { value: data.stats.pending, label: "Pending proposals" },
          { value: data.stats.evidence, label: "Evidence signals" },
          {
            value: new Set(data.proposals.map((p) => p.type)).size,
            label: "Proposal types",
          },
        ]}
      />
      <main className="radar-page-main">
        <ProposalsQueue proposals={data.proposals} />
      </main>
    </>
  );
}
