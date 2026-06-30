import { AppShell } from "@/components/AppShell";
import { TimelinePageContent } from "@/components/TimelinePageContent";
import { getTimelineData } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const data = await getTimelineData();

  return (
    <AppShell active="timeline" pendingProposals={data.pendingProposals}>
      <TimelinePageContent rows={data.rows} />
    </AppShell>
  );
}
