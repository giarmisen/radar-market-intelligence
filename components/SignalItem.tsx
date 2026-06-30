"use client";

import type { LivingDocumentSignal } from "@/lib/living-document";
import { formatDate, formatLifecycle } from "@/lib/format";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { GroupedSources } from "./GroupedSources";

interface SignalItemProps {
  signal: LivingDocumentSignal;
  variant?: "default" | "worth-watching";
  showNewBadge?: boolean;
}

export function SignalItem({
  signal,
  variant = "default",
  showNewBadge = true,
}: SignalItemProps) {
  const sourceCount = signal.source_count ?? signal.grouped_sources?.length ?? 1;
  const groupedSources =
    signal.grouped_sources ??
    (signal.source_url
      ? [
          {
            id: signal.id,
            source_url: signal.source_url,
            summary: signal.summary,
            relevance: signal.relevance,
            event_date: signal.event_date,
            captured_at: signal.captured_at,
          },
        ]
      : []);

  if (variant === "worth-watching") {
    return (
    <article
      id={`signal-${signal.id}`}
      data-signal-id={signal.id}
      className="radar-worth-watching-card"
    >
        <div className="radar-signal-header">
          <div>
            <span className="text-date radar-signal-date">
              {formatDate(signal.event_date)}
            </span>
            {showNewBadge ? <SignalBadge capturedAt={signal.captured_at} /> : null}
            <CategoryBadge category={signal.category} />
            {sourceCount > 1 ? (
              <span className="radar-source-count-badge">{sourceCount} sources</span>
            ) : null}
          </div>
          <span
            className={`radar-score-badge radar-score-${signal.relevance}`}
          >
            {signal.relevance}
          </span>
        </div>
        <p className="text-signal-body radar-signal-text">{signal.summary}</p>
        {signal.so_what ? (
          <p className="text-signal-sowhat radar-signal-sowhat">→ {signal.so_what}</p>
        ) : null}
        <GroupedSources sourceCount={sourceCount} sources={groupedSources} />
      </article>
    );
  }

  const scoreClass =
    signal.relevance === 3
      ? "radar-signal-3"
      : signal.relevance === 2
        ? "radar-signal-2"
        : "radar-signal-1";

  return (
    <article
      id={`signal-${signal.id}`}
      data-signal-id={signal.id}
      className={`radar-signal ${scoreClass}`}
    >
      <div className="radar-signal-header">
        <div>
          <span className="text-date radar-signal-date">
            {formatDate(signal.event_date)}
          </span>
          {showNewBadge ? <SignalBadge capturedAt={signal.captured_at} /> : null}
          <CategoryBadge category={signal.category} />
          {sourceCount > 1 ? (
            <span className="radar-source-count-badge">{sourceCount} sources</span>
          ) : null}
          {signal.lifecycle ? (
            <span className="radar-lifecycle-tag">
              {formatLifecycle(signal.lifecycle)}
            </span>
          ) : null}
        </div>
        <div>
          <span
            className={`radar-score-badge radar-score-${signal.relevance}`}
          >
            {signal.relevance}
          </span>
        </div>
      </div>
      <p className="text-signal-body radar-signal-text">{signal.summary}</p>
      {signal.so_what ? (
        <p className="text-signal-sowhat radar-signal-sowhat">→ {signal.so_what}</p>
      ) : null}
      <GroupedSources sourceCount={sourceCount} sources={groupedSources} />
    </article>
  );
}
