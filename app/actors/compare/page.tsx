import { Suspense } from "react";
import { ActorCompareView } from "@/components/ActorCompareView";
import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { StatGrid } from "@/components/StatGrid";
import {
  getActorComparePageData,
  getActorProfilesForCompare,
} from "@/lib/actor-profile";

export const dynamic = "force-dynamic";

interface ActorComparePageProps {
  searchParams: { actor?: string | string[] };
}

export default async function ActorComparePage({
  searchParams,
}: ActorComparePageProps) {
  const slugs = Array.isArray(searchParams.actor)
    ? searchParams.actor
    : searchParams.actor
      ? [searchParams.actor]
      : [];

  const [pageData, profiles] = await Promise.all([
    getActorComparePageData(),
    getActorProfilesForCompare(slugs),
  ]);

  return (
    <AppShell active="actors" pendingProposals={pageData.pendingProposals}>
      <PageTopbar
        title="Compare actors"
        subtitle="Side-by-side profiles for Tier 1 actors — business model, AI strategy, and positioning."
        meta={pageData.domainName}
      />
      <div className="radar-content">
        <StatGrid
          stats={[
            {
              value: pageData.options.filter((option) => option.hasProfile).length,
              label: "Profiles available",
            },
            { value: profiles.length, label: "Selected" },
            { value: 3, label: "Max compare" },
            { value: pageData.options.length, label: "Tier 1 options" },
          ]}
        />
        <Suspense fallback={<p className="radar-empty">Loading compare view…</p>}>
          <ActorCompareView options={pageData.options} profiles={profiles} />
        </Suspense>
      </div>
    </AppShell>
  );
}
