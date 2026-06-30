"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimelineRow } from "@/lib/timeline";
import {
  formatDate,
  formatLifecycle,
} from "@/lib/format";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { GroupedSources } from "./GroupedSources";
import {
  filterTimelineRows,
  type TimelineFiltersState,
} from "./TimelineFilters";

interface TimelineTableProps {
  rows: TimelineRow[];
  filters: TimelineFiltersState;
}

const PAGE_SIZE = 25;

type SortKey = "event_date" | "category" | "relevance" | "top_tier";
type SortDir = "asc" | "desc";

function timelineSources(row: TimelineRow) {
  const sourceCount = row.source_count ?? row.grouped_sources?.length ?? 1;
  const sources =
    row.grouped_sources ??
    (row.source_url
      ? [
          {
            id: row.id,
            source_url: row.source_url,
            summary: row.summary,
            relevance: row.relevance,
            event_date: row.event_date,
            captured_at: row.captured_at,
          },
        ]
      : []);

  return { sourceCount, sources };
}

function TimelineCard({ row }: { row: TimelineRow }) {
  const actorLabel =
    row.actors.length > 0 ? row.actors.map((actor) => actor.name).join(", ") : "—";
  const { sourceCount, sources } = timelineSources(row);

  return (
    <article data-signal-id={row.id} className="timeline-card">
      <div className="timeline-card-content">
        <p className="text-signal-body timeline-card-summary">{row.summary}</p>
        {row.so_what ? (
          <p className="text-signal-sowhat radar-signal-sowhat">→ {row.so_what}</p>
        ) : null}
        <GroupedSources
          sourceCount={sourceCount}
          sources={sources}
          linkClassName="text-source-url radar-signal-source timeline-card-source"
        />
      </div>
      <div className="timeline-card-meta">
        <span className="timeline-card-pill text-date">{formatDate(row.event_date)}</span>
        <SignalBadge capturedAt={row.captured_at} />
        {sourceCount > 1 ? (
          <span className="radar-source-count-badge">{sourceCount} sources</span>
        ) : null}
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

export function TimelineTable({ rows, filters }: TimelineTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("event_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, sortKey, sortDir]);

  const filtered = useMemo(
    () => filterTimelineRows(rows, filters),
    [rows, filters],
  );

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
                <tr key={row.id} data-signal-id={row.id}>
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
                    {(() => {
                      const { sourceCount, sources } = timelineSources(row);
                      return (
                        <div className="radar-table-source-cell">
                          {sourceCount > 1 ? (
                            <span className="radar-source-count-badge">
                              {sourceCount} sources
                            </span>
                          ) : null}
                          <GroupedSources
                            sourceCount={sourceCount}
                            sources={sources}
                            linkClassName="text-source-url radar-table-link radar-table-source-link"
                          />
                        </div>
                      );
                    })()}
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
