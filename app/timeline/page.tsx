import { AppShell } from "@/components/AppShell";
import { TimelinePageContent } from "@/components/TimelinePageContent";
import { getTimelineData } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const data = await getTimelineData();
  const worthWatchingCount = data.rows.filter((row) => row.actors.length === 0).length;

  return (
    <AppShell active="timeline" pendingProposals={data.pendingProposals}>
      <TimelinePageContent
        domainName={data.domainName}
        rows={data.rows}
        stats={data.stats}
        worthWatchingCount={worthWatchingCount}
      />
    </AppShell>
  );
}
