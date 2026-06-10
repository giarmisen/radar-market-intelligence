import type { LivingDocumentSignal } from "@/lib/living-document";
import {
  categoryClassName,
  formatCategory,
  formatDate,
  formatLifecycle,
} from "@/lib/format";

interface SignalItemProps {
  signal: LivingDocumentSignal;
}

export function SignalItem({ signal }: SignalItemProps) {
  const scoreClass =
    signal.relevance === 3
      ? "radar-signal-3"
      : signal.relevance === 2
        ? "radar-signal-2"
        : "radar-signal-1";

  return (
    <article className={`radar-signal ${scoreClass}`}>
      <div className="radar-signal-header">
        <div>
          <span className={categoryClassName(signal.category)}>
            {formatCategory(signal.category)}
          </span>
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
          <span className="radar-signal-date">
            {formatDate(signal.event_date)}
          </span>
        </div>
      </div>
      <p className="radar-signal-text">{signal.summary}</p>
      {signal.so_what ? (
        <p className="radar-signal-sowhat">→ {signal.so_what}</p>
      ) : null}
      <a
        href={signal.source_url}
        className="radar-signal-source"
        target="_blank"
        rel="noopener noreferrer"
      >
        {signal.source_url.replace(/^https?:\/\//, "").slice(0, 48)}
        {signal.source_url.length > 56 ? "…" : ""}
      </a>
    </article>
  );
}
