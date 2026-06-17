"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineRow } from "@/lib/timeline";
import type { TierFilterValue } from "./FilterPills";
import type { SignalCategory } from "@/lib/types";
import {
  formatCategory,
  formatDate,
  formatLifecycle,
} from "@/lib/format";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { SignalBadge } from "@/components/ui/SignalBadge";

interface TimelineTableProps {
  rows: TimelineRow[];
  tierFilter?: TierFilterValue;
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
  relevance: "",
  dateFrom: "",
  dateTo: "",
};

const PAGE_SIZE = 25;

function TimelineCard({ row }: { row: TimelineRow }) {
  const actorLabel =
    row.actors.length > 0 ? row.actors.map((actor) => actor.name).join(", ") : "—";

  return (
    <article className="timeline-card">
      <div className="timeline-card-content">
        <p className="text-signal-body timeline-card-summary">{row.summary}</p>
        {row.so_what ? (
          <p className="text-signal-sowhat radar-signal-sowhat">→ {row.so_what}</p>
        ) : null}
        <a
          href={row.source_url}
          className="text-source-url radar-signal-source timeline-card-source"
          target="_blank"
          rel="noopener noreferrer"
        >
          {row.source_url.replace(/^https?:\/\//, "")}
        </a>
      </div>
      <div className="timeline-card-meta">
        <span className="timeline-card-pill text-date">{formatDate(row.event_date)}</span>
        <SignalBadge capturedAt={row.captured_at} />
        {row.lifecycle ? (
          <span className="timeline-card-pill timeline-card-pill-lifecycle">
            {formatLifecycle(row.lifecycle)}
          </span>
        ) : null}
        <CategoryBadge category={row.category} className="timeline-card-pill" />
        <span className="timeline-card-pill">{actorLabel}</span>
        <span className={`radar-score-badge radar-score-${row.relevance}`}>
          {row.relevance}
        </span>
      </div>
    </article>
  );
}

export function TimelineTable({ rows, tierFilter = "all" }: TimelineTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("event_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, tierFilter, sortKey, sortDir]);

  const actorOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      for (const actor of row.actors) {
        names.add(actor.name);
      }
    }
    return Array.from(names).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (tierFilter === "worth-watching") {
        if (row.actors.length > 0) {
          return false;
        }
      } else if (tierFilter !== "all") {
        if (row.top_tier !== Number(tierFilter)) {
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
  }, [rows, filters, tierFilter]);

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

  const visibleRows = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );

  const remaining = sorted.length - visibleRows.length;
  const nextBatch = Math.min(PAGE_SIZE, remaining);

  function showMore() {
    setVisibleCount((count) => Math.min(count + PAGE_SIZE, sorted.length));
  }

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

      <div className="timeline-views">
        <div className="radar-table-wrap timeline-table-wrap">
          <table className="radar-table timeline-table">
          <colgroup>
            <col className="radar-table-col-date" />
            <col className="radar-table-col-category" />
            <col className="radar-table-col-actors" />
            <col className="radar-table-col-tier" />
            <col className="radar-table-col-score" />
            <col className="radar-table-col-summary" />
            <col className="radar-table-col-source" />
          </colgroup>
          <thead>
            <tr>
              <th
                className={`radar-table-col-date${sortKey === "event_date" ? " sorted" : ""}`}
              >
                <button type="button" onClick={() => toggleSort("event_date")}>
                  Date{sortIndicator("event_date")}
                </button>
              </th>
              <th
                className={`radar-table-col-category${sortKey === "category" ? " sorted" : ""}`}
              >
                <button type="button" onClick={() => toggleSort("category")}>
                  Category{sortIndicator("category")}
                </button>
              </th>
              <th className="radar-table-col-actors">Actors</th>
              <th className={`radar-table-col-tier${sortKey === "top_tier" ? " sorted" : ""}`}>
                <button type="button" onClick={() => toggleSort("top_tier")}>
                  Tier{sortIndicator("top_tier")}
                </button>
              </th>
              <th
                className={`radar-table-col-score${sortKey === "relevance" ? " sorted" : ""}`}
              >
                <button type="button" onClick={() => toggleSort("relevance")}>
                  Score{sortIndicator("relevance")}
                </button>
              </th>
              <th className="radar-table-col-summary">Summary</th>
              <th className="radar-table-col-source">Source</th>
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
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td className="radar-table-col-date">
                    <div className="radar-table-badge-row">
                      <span className="text-date radar-signal-date">
                        {formatDate(row.event_date)}
                      </span>
                      <SignalBadge capturedAt={row.captured_at} />
                      {row.lifecycle ? (
                        <span className="radar-lifecycle-tag">
                          {formatLifecycle(row.lifecycle)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="radar-table-col-category">
                    <CategoryBadge category={row.category} />
                  </td>
                  <td className="radar-table-col-actors">
                    {row.actors.length > 0
                      ? row.actors.map((a) => a.name).join(", ")
                      : "—"}
                  </td>
                  <td className="radar-table-col-tier">
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
                  <td className="radar-table-col-score">
                    <span
                      className={`radar-score-badge radar-score-${row.relevance}`}
                    >
                      {row.relevance}
                    </span>
                  </td>
                  <td className="radar-table-col-summary">
                    <div className="text-signal-body radar-signal-text">{row.summary}</div>
                    {row.so_what ? (
                      <p className="text-signal-sowhat radar-signal-sowhat">→ {row.so_what}</p>
                    ) : null}
                  </td>
                  <td className="radar-table-col-source">
                    <a
                      href={row.source_url}
                      className="text-source-url radar-table-link radar-table-source-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.source_url}
                    >
                      {row.source_url.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        <div className="timeline-cards">
          {sorted.length === 0 ? (
            <p className="radar-empty">No signals match the current filters.</p>
          ) : (
            visibleRows.map((row) => <TimelineCard key={row.id} row={row} />)
          )}
        </div>
      </div>

      {sorted.length > 0 && remaining > 0 ? (
        <div className="timeline-show-more-wrap">
          <button type="button" className="timeline-show-more" onClick={showMore}>
            Show {nextBatch} more ({remaining} remaining)
          </button>
        </div>
      ) : null}
    </>
  );
}
