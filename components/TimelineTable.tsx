"use client";

import { useMemo, useState } from "react";
import type { TimelineRow } from "@/lib/timeline";
import type { SignalCategory } from "@/lib/types";
import {
  categoryClassName,
  formatCategory,
  formatDate,
  formatLifecycle,
} from "@/lib/format";
import { SignalNewBadge } from "./SignalItem";

interface TimelineTableProps {
  rows: TimelineRow[];
}

type SortKey = "event_date" | "category" | "relevance" | "top_tier";
type SortDir = "asc" | "desc";

const CATEGORIES: SignalCategory[] = [
  "product",
  "regulatory",
  "geopolitical",
  "commercial",
  "team",
  "communications",
  "technical",
];

const EMPTY_FILTERS = {
  category: "",
  actor: "",
  tier: "",
  relevance: "",
  dateFrom: "",
  dateTo: "",
};

export function TimelineTable({ rows }: TimelineTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("event_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const actorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      for (const actor of row.actors) {
        names.add(actor.name);
      }
    }
    return Array.from(names).sort();
  }, [rows]);

  const tierOptions = useMemo(() => {
    const tiers = new Set<number>();
    for (const row of rows) {
      if (row.top_tier < 99) {
        tiers.add(row.top_tier);
      }
    }
    return Array.from(tiers).sort((a, b) => a - b);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filters.category && row.category !== filters.category) {
        return false;
      }
      if (filters.actor && !row.actors.some((a) => a.name === filters.actor)) {
        return false;
      }
      if (filters.tier && row.top_tier !== Number(filters.tier)) {
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
  }, [rows, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "event_date":
          cmp = a.event_date.localeCompare(b.event_date);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "relevance":
          cmp = a.relevance - b.relevance;
          break;
        case "top_tier":
          cmp = a.top_tier - b.top_tier;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "event_date" ? "desc" : "asc");
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) {
      return "";
    }
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <>
      <div className="radar-filters">
        <span className="radar-filter-label">Filters</span>
        <select
          className="radar-filter-control"
          value={filters.category}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value }))
          }
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
          onChange={(e) => setFilters((f) => ({ ...f, actor: e.target.value }))}
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
          value={filters.tier}
          onChange={(e) => setFilters((f) => ({ ...f, tier: e.target.value }))}
        >
          <option value="">All tiers</option>
          {tierOptions.map((tier) => (
            <option key={tier} value={tier}>
              Tier {tier}
            </option>
          ))}
        </select>
        <select
          className="radar-filter-control"
          value={filters.relevance}
          onChange={(e) =>
            setFilters((f) => ({ ...f, relevance: e.target.value }))
          }
        >
          <option value="">All relevance</option>
          <option value="3">3 — Critical</option>
          <option value="2">2 — Relevant</option>
          <option value="1">1 — Context</option>
        </select>
        <input
          type="date"
          className="radar-filter-control"
          value={filters.dateFrom}
          onChange={(e) =>
            setFilters((f) => ({ ...f, dateFrom: e.target.value }))
          }
          aria-label="From date"
        />
        <input
          type="date"
          className="radar-filter-control"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          aria-label="To date"
        />
        <button
          type="button"
          className="radar-filter-reset"
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          Reset
        </button>
        <span className="radar-filter-count">
          {sorted.length} of {rows.length} signals
        </span>
      </div>

      <div className="radar-table-wrap">
        <table className="radar-table">
          <thead>
            <tr>
              <th className={sortKey === "event_date" ? "sorted" : ""}>
                <button type="button" onClick={() => toggleSort("event_date")}>
                  Date{sortIndicator("event_date")}
                </button>
              </th>
              <th className={sortKey === "category" ? "sorted" : ""}>
                <button type="button" onClick={() => toggleSort("category")}>
                  Category{sortIndicator("category")}
                </button>
              </th>
              <th>Actors</th>
              <th className={sortKey === "top_tier" ? "sorted" : ""}>
                <button type="button" onClick={() => toggleSort("top_tier")}>
                  Tier{sortIndicator("top_tier")}
                </button>
              </th>
              <th className={sortKey === "relevance" ? "sorted" : ""}>
                <button type="button" onClick={() => toggleSort("relevance")}>
                  Score{sortIndicator("relevance")}
                </button>
              </th>
              <th>Summary</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className="radar-empty">No signals match the current filters.</p>
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="radar-signal-meta-inline">
                      <span className="radar-signal-date">
                        {formatDate(row.event_date)}
                      </span>
                      <SignalNewBadge capturedAt={row.captured_at} />
                    </div>
                    {row.lifecycle ? (
                      <div className="radar-lifecycle-stack">
                        <span className="radar-lifecycle-tag">
                          {formatLifecycle(row.lifecycle)}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={categoryClassName(row.category)}>
                      {formatCategory(row.category)}
                    </span>
                  </td>
                  <td className="radar-table-actors">
                    {row.actors.length > 0
                      ? row.actors.map((a) => a.name).join(", ")
                      : "—"}
                  </td>
                  <td>
                    {row.top_tier < 99 ? (
                      <span
                        className={`radar-tier-badge${row.top_tier === 2 ? " radar-tier-badge-2" : ""}`}
                      >
                        Tier {row.top_tier}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span
                      className={`radar-score-badge radar-score-${row.relevance}`}
                    >
                      {row.relevance}
                    </span>
                  </td>
                  <td>
                    <div className="radar-signal-text">{row.summary}</div>
                    {row.so_what ? (
                      <p className="radar-signal-sowhat">→ {row.so_what}</p>
                    ) : null}
                  </td>
                  <td>
                    <a
                      href={row.source_url}
                      className="radar-table-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.source_url.replace(/^https?:\/\//, "").slice(0, 48)}
                      {row.source_url.length > 56 ? "…" : ""}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
