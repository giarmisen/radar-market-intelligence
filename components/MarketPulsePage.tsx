"use client";

import { useState } from "react";
import type { LivingDocumentPageData } from "@/lib/living-document";
import { ActorCard } from "./ActorCard";
import { FilterPills, type TierFilterValue } from "./FilterPills";
import { PageTopbar } from "./PageTopbar";
import { StatGrid } from "./StatGrid";
import { UpcomingBar } from "./UpcomingBar";
import { WorthWatchingSection } from "./WorthWatchingSection";

interface MarketPulsePageProps {
  data: LivingDocumentPageData;
}

export function MarketPulsePage({ data }: MarketPulsePageProps) {
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");

  const filteredTiers = data.tiers
    .map((tier) => ({
      ...tier,
      actors: tier.actors.filter((actor) => {
        if (tierFilter === "all") {
          return true;
        }
        if (tierFilter === "worth-watching") {
          return false;
        }
        return String(actor.tier) === tierFilter;
      }),
    }))
    .filter((tier) => tier.actors.length > 0);

  const showWorthWatching =
    tierFilter === "all" || tierFilter === "worth-watching";
  const showActorCards = tierFilter !== "worth-watching";
  const hasContent =
    (showActorCards && filteredTiers.some((tier) => tier.actors.length > 0)) ||
    (showWorthWatching && data.worthWatching.length > 0);

  return (
    <>
      <PageTopbar
        title="Market Pulse"
        subtitle="Latest signals per tracked actor — full history in Timeline."
        filters={
          <FilterPills
            value={tierFilter}
            onChange={setTierFilter}
            worthWatchingCount={data.worthWatching.length}
          />
        }
      />
      <div className="radar-content">
        <StatGrid
          stats={[
            { value: data.stats.actors, label: "Actors with signals" },
            { value: data.stats.signals, label: "Pulse signals" },
            { value: data.stats.upcoming, label: "Upcoming events" },
            { value: data.worthWatching.length, label: "Worth watching" },
          ]}
        />

        <UpcomingBar events={data.upcoming} />

        {!hasContent ? (
          <p className="radar-empty">
            No signals match this filter. Run ingestion to populate signals.
          </p>
        ) : null}

        {showActorCards
          ? filteredTiers.map((tier) => (
              <section key={tier.tier} className="radar-tier-section">
                {tierFilter === "all" ? (
                  <h2 className="radar-section-label text-section-label">{tier.label}</h2>
                ) : null}
                <div className="radar-cards">
                  {tier.actors.map((actor) => (
                    <ActorCard key={actor.id} actor={actor} />
                  ))}
                </div>
              </section>
            ))
          : null}

        {showWorthWatching ? (
          <WorthWatchingSection signals={data.worthWatching} />
        ) : null}
      </div>
    </>
  );
}
