"use client";

import { useMemo, useState } from "react";
import type { LivingDocumentPageData } from "@/lib/living-document";
import { collectPulseSignalIds } from "@/lib/pulse-navigation";
import { ActorCard } from "./ActorCard";
import { FilterPills, type TierFilterValue } from "./FilterPills";
import { PageTopbar } from "./PageTopbar";
import { NewTodaySection } from "./NewTodaySection";
import { UpcomingBar } from "./UpcomingBar";
import { WorthWatchingSection } from "./WorthWatchingSection";

interface MarketPulsePageProps {
  data: LivingDocumentPageData;
}

export function MarketPulsePage({ data }: MarketPulsePageProps) {
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");
  const pulseSignalIds = useMemo(() => collectPulseSignalIds(data), [data]);

  const showUpcoming =
    (tierFilter === "all" || tierFilter === "1" || tierFilter === "2") &&
    data.upcoming.length > 0;
  const showNewToday =
    (tierFilter === "all" ||
      tierFilter === "new-today" ||
      tierFilter === "1" ||
      tierFilter === "2") &&
    data.newToday.length > 0;
  const showActorCards =
    tierFilter === "all" || tierFilter === "1" || tierFilter === "2";
  const showWorthWatching =
    tierFilter === "all" || tierFilter === "worth-watching";

  const filteredTiers = data.tiers
    .map((tier) => ({
      ...tier,
      actors: tier.actors.filter((actor) => {
        if (tierFilter === "all") {
          return true;
        }
        if (tierFilter === "1" || tierFilter === "2") {
          return String(actor.tier) === tierFilter;
        }
        return false;
      }),
    }))
    .filter((tier) => tier.actors.length > 0);

  const hasContent =
    showNewToday ||
    showUpcoming ||
    (showActorCards && filteredTiers.some((tier) => tier.actors.length > 0)) ||
    (showWorthWatching && data.worthWatching.length > 0);

  return (
    <>
      <PageTopbar
        title="Market Pulse"
        subtitle="Today's signals, upcoming events, and recent market activity by tier."
        filters={
          <FilterPills
            variant="market-pulse"
            value={tierFilter}
            onChange={setTierFilter}
            newTodayCount={data.newToday.length}
            worthWatchingCount={data.worthWatching.length}
          />
        }
      />
      <div className="radar-content">
        {showUpcoming || showNewToday ? (
          <div className="radar-pulse-summary">
            {showUpcoming ? (
              <UpcomingBar events={data.upcoming} pulseSignalIds={pulseSignalIds} />
            ) : null}
            {showNewToday ? <NewTodaySection signals={data.newToday} /> : null}
          </div>
        ) : null}

        {!hasContent ? (
          <p className="radar-empty">
            No signals match this filter. Run ingestion to populate signals.
          </p>
        ) : null}

        {showActorCards && filteredTiers.length > 0 ? (
          <div className="radar-pulse-tiers">
            {filteredTiers.map((tier) => (
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
            ))}
          </div>
        ) : null}

        {showWorthWatching ? (
          <WorthWatchingSection signals={data.worthWatching} />
        ) : null}
      </div>
    </>
  );
}
