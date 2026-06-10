import Link from "next/link";
import { ActorsRegistry } from "@/components/ActorsRegistry";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { getActorsPageData } from "@/lib/actors-page";

export const dynamic = "force-dynamic";

export default async function ActorsPage() {
  const data = await getActorsPageData();

  return (
    <>
      <Nav active="actors" pendingProposals={data.pendingProposals} />
      <Hero
        eyebrow={data.domainName}
        title="Actors"
        sub="Tracked actor registry — tier, role, geography, and lifecycle status. Pending proposals are flagged inline."
        stats={[
          { value: data.stats.total, label: "Tracked actors" },
          { value: data.stats.active, label: "Active" },
          { value: data.stats.withProposals, label: "Pending proposals" },
        ]}
      />
      <main className="radar-page-main">
        <div className="radar-profile-toolbar">
          <Link href="/actors/compare" className="radar-profile-compare-link">
            Compare Tier 1 profiles →
          </Link>
        </div>
        {data.tiers.length === 0 ? (
          <p className="radar-empty">
            No actors seeded yet. Run POST /api/seed to load the domain registry.
          </p>
        ) : (
          <ActorsRegistry data={data} />
        )}
      </main>
    </>
  );
}
