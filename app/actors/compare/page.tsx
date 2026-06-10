import { Suspense } from "react";
import { ActorCompareView } from "@/components/ActorCompareView";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
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
    <>
      <Nav active="actors" pendingProposals={pageData.pendingProposals} />
      <Hero
        eyebrow={pageData.domainName}
        title="Compare actors"
        sub="Side-by-side profiles for Tier 1 actors — business model, AI strategy, and positioning."
        stats={[
          {
            value: pageData.options.filter((option) => option.hasProfile).length,
            label: "Profiles available",
          },
          { value: profiles.length, label: "Selected" },
          { value: 3, label: "Max compare" },
        ]}
      />
      <main className="radar-page-main">
        <Suspense fallback={<p className="radar-empty">Loading compare view…</p>}>
          <ActorCompareView options={pageData.options} profiles={profiles} />
        </Suspense>
      </main>
    </>
  );
}
