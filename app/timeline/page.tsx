import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { TimelineTable } from "@/components/TimelineTable";
import { getTimelineData } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const data = await getTimelineData();

  return (
    <>
      <Nav active="timeline" pendingProposals={data.pendingProposals} />
      <Hero
        eyebrow={data.domainName}
        title="Timeline"
        sub="Full signal history for quarterly review — filter and sort across category, actor, tier, relevance, and date."
        stats={[
          { value: data.stats.total, label: "Signals in history" },
          { value: data.stats.actors, label: "Actors referenced" },
          { value: data.stats.categories, label: "Categories" },
        ]}
      />
      <main className="radar-page-main">
        {data.rows.length === 0 ? (
          <p className="radar-empty">
            No signals in history yet. Run ingestion to populate the timeline.
          </p>
        ) : (
          <TimelineTable rows={data.rows} />
        )}
      </main>
    </>
  );
}
