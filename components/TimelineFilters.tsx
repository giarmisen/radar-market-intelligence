"use client";

import { useMemo } from "react";
import type { TimelineRow } from "@/lib/timeline";
import type { SignalCategory } from "@/lib/types";
import { formatCategory } from "@/lib/format";

export type TimelineTierFilter = "" | "1" | "2" | "worth-watching";

export type TimelineFiltersState = {
  category: string;
  actor: string;
  relevance: string;
  tier: TimelineTierFilter;
  dateFrom: string;
  dateTo: string;
};

export const EMPTY_TIMELINE_FILTERS: TimelineFiltersState = {
  category: "",
  actor: "",
  relevance: "",
  tier: "",
  dateFrom: "",
  dateTo: "",
};

const CATEGORIES: SignalCategory[] = [
  "product",
  "regulatory",
  "geopolitical",
  "commercial",
  "team",
  "communications",
  "technical",
];

export function filterTimelineRows(
  rows: TimelineRow[],
  filters: TimelineFiltersState,
): TimelineRow[] {
  return rows.filter((row) => {
    if (filters.tier === "worth-watching") {
      if (row.actors.length > 0) {
        return false;
      }
    } else if (filters.tier) {
      if (row.top_tier !== Number(filters.tier)) {
        return false;
      }
    }

    if (filters.category && row.category !== filters.category) {
      return false;
    }
    if (filters.actor && !row.actors.some((a) => a.name === filters.actor)) {
      return false;
    }
    if (filters.relevance && row.relevance !== Number(filters.relevance)) {
      return false;
    }
    if (filters.dateFrom && row.event_date < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && row.event_date > filters.dateTo) {
      return false;
    }
    return true;
  });
}

interface TimelineFiltersProps {
  rows: TimelineRow[];
  filters: TimelineFiltersState;
  onChange: (filters: TimelineFiltersState) => void;
}

export function TimelineFilters({ rows, filters, onChange }: TimelineFiltersProps) {
  const actorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      for (const actor of row.actors) {
        names.add(actor.name);
      }
    }
    return Array.from(names).sort();
  }, [rows]);

  const filteredCount = useMemo(
    () => filterTimelineRows(rows, filters).length,
    [rows, filters],
  );

  return (
    <div className="radar-filters">
      <span className="radar-filter-label">Filters</span>
      <select
        className="radar-filter-control"
        value={filters.category}
        aria-label="Filter by category"
        onChange={(e) => onChange({ ...filters, category: e.target.value })}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {formatCategory(cat)}
          </option>
        ))}
      </select>
      <select
        className="radar-filter-control"
        value={filters.actor}
        aria-label="Filter by actor"
        onChange={(e) => onChange({ ...filters, actor: e.target.value })}
      >
        <option value="">All actors</option>
        {actorOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <select
        className="radar-filter-control"
        value={filters.relevance}
        aria-label="Filter by relevance"
        onChange={(e) => onChange({ ...filters, relevance: e.target.value })}
      >
        <option value="">All relevance</option>
        <option value="3">3 (Critical)</option>
        <option value="2">2 (Relevant)</option>
        <option value="1">1 (Context)</option>
      </select>
      <select
        className="radar-filter-control"
        value={filters.tier}
        aria-label="Filter by tier"
        onChange={(e) =>
          onChange({
            ...filters,
            tier: e.target.value as TimelineTierFilter,
          })
        }
      >
        <option value="">All tiers</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="worth-watching">Worth Watching</option>
      </select>
      <input
        type="date"
        className="radar-filter-control"
        value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        aria-label="From date"
      />
      <input
        type="date"
        className="radar-filter-control"
        value={filters.dateTo}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        aria-label="To date"
      />
      <button
        type="button"
        className="radar-filter-reset"
        onClick={() => onChange(EMPTY_TIMELINE_FILTERS)}
      >
        Reset
      </button>
      <span className="radar-filter-count">
        {filteredCount} of {rows.length} signals
      </span>
    </div>
  );
}
