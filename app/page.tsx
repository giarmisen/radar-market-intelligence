import { ActorCard } from "@/components/ActorCard";
import { Hero } from "@/components/Hero";
import { Nav } from "@/components/Nav";
import { Sidebar } from "@/components/Sidebar";
import { UpcomingBar } from "@/components/UpcomingBar";
import { WorthWatchingSection } from "@/components/WorthWatchingSection";
import { getLivingDocumentData } from "@/lib/living-document";

export const dynamic = "force-dynamic";

export default async function LivingDocumentPage() {
  const data = await getLivingDocumentData();

  return (
    <>
      <Nav active="living" pendingProposals={data.pendingProposals} />
      <Hero
        eyebrow={data.domainName}
        title="Market Pulse"
        sub="Latest signals per tracked actor — full history in Timeline."
        stats={[
          { value: data.stats.actors, label: "Actors with signals" },
          { value: data.stats.signals, label: "Market Pulse signals" },
          { value: data.stats.upcoming, label: "Upcoming events" },
        ]}
      />
      <UpcomingBar events={data.upcoming} />
      <div className="radar-body">
        <Sidebar
          tiers={data.tiers}
          worthWatchingCount={data.worthWatching.length}
        />
        <main className="radar-main">
          {data.tiers.length === 0 ? (
            <p className="radar-empty">
              No signals in Market Pulse yet. Run ingestion to populate
              signals for tracked actors.
            </p>
          ) : (
            data.tiers.map((tier) => (
              <section
                key={tier.tier}
                id={`tier-${tier.tier}`}
                className="radar-tier-section"
              >
                <h2 className="radar-section-label">{tier.label}</h2>
                <div className="radar-cards">
                  {tier.actors.map((actor) => (
                    <ActorCard key={actor.id} actor={actor} />
                  ))}
                </div>
              </section>
            ))
          )}
          <WorthWatchingSection signals={data.worthWatching} />
        </main>
      </div>
    </>
  );
}
