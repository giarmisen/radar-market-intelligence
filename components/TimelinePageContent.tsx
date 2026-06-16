"use client";

import { useState } from "react";
import type { TimelineRow } from "@/lib/timeline";
import { FilterPills, type TierFilterValue } from "./FilterPills";
import { PageTopbar } from "./PageTopbar";
import { StatGrid } from "./StatGrid";
import { TimelineTable } from "./TimelineTable";

interface TimelinePageContentProps {
  domainName: string;
  rows: TimelineRow[];
  stats: {
    total: number;
    actors: number;
    categories: number;
  };
  worthWatchingCount: number;
}

export function TimelinePageContent({
  domainName,
  rows,
  stats,
  worthWatchingCount,
}: TimelinePageContentProps) {
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");

  return (
    <>
      <PageTopbar
        title="Timeline"
        subtitle="Full signal history — filter by tier, category, actor, relevance, and date."
        meta={domainName}
        filters={
          <FilterPills
            value={tierFilter}
            onChange={setTierFilter}
            worthWatchingCount={worthWatchingCount}
          />
        }
      />
      <div className="radar-content">
        <StatGrid
          stats={[
            { value: stats.total, label: "Signals in history" },
            { value: stats.actors, label: "Actors referenced" },
            { value: stats.categories, label: "Categories" },
            { value: worthWatchingCount, label: "Worth watching" },
          ]}
        />
        {rows.length === 0 ? (
          <p className="radar-empty">
            No signals in history yet. Run ingestion to populate the timeline.
          </p>
        ) : (
          <TimelineTable rows={rows} tierFilter={tierFilter} />
        )}
      </div>
    </>
  );
}
