"use client";

import { useEffect, useState } from "react";
import type { TimelineRow } from "@/lib/timeline";
import { scrollToSignal } from "@/lib/pulse-navigation";
import {
  EMPTY_TIMELINE_FILTERS,
  TimelineFilters,
  type TimelineFiltersState,
} from "./TimelineFilters";
import { PageTopbar } from "./PageTopbar";
import { TimelineTable } from "./TimelineTable";

interface TimelinePageContentProps {
  rows: TimelineRow[];
}

export function TimelinePageContent({ rows }: TimelinePageContentProps) {
  const [filters, setFilters] = useState<TimelineFiltersState>(EMPTY_TIMELINE_FILTERS);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#signal-")) {
      return;
    }

    const signalId = decodeURIComponent(hash.slice("#signal-".length));
    if (!signalId) {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToSignal(signalId);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [rows]);

  return (
    <>
      <PageTopbar
        title="Timeline"
        subtitle="Full signal history. Filter by tier, category, actor, relevance, and date."
        filters={
          rows.length > 0 ? (
            <TimelineFilters rows={rows} filters={filters} onChange={setFilters} />
          ) : null
        }
      />
      <div className="radar-content">
        {rows.length === 0 ? (
          <p className="radar-empty">
            No signals in history yet. Run ingestion to populate the timeline.
          </p>
        ) : (
          <TimelineTable rows={rows} filters={filters} />
        )}
      </div>
    </>
  );
}
