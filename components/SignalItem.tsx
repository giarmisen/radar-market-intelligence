import type { LivingDocumentSignal } from "@/lib/living-document";
import { formatDate, formatLifecycle } from "@/lib/format";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { SignalBadge } from "@/components/ui/SignalBadge";

interface SignalItemProps {
  signal: LivingDocumentSignal;
  variant?: "default" | "worth-watching";
}

export function SignalItem({ signal, variant = "default" }: SignalItemProps) {
  if (variant === "worth-watching") {
    return (
      <article className="radar-worth-watching-card">
        <div className="radar-signal-header">
          <div>
            <span className="text-date radar-signal-date">
              {formatDate(signal.event_date)}
            </span>
            <SignalBadge capturedAt={signal.captured_at} />
            <CategoryBadge category={signal.category} />
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
        <a
          href={signal.source_url}
          className="text-source-url radar-signal-source"
          target="_blank"
          rel="noopener noreferrer"
        >
          {signal.source_url.replace(/^https?:\/\//, "").slice(0, 48)}
          {signal.source_url.length > 56 ? "…" : ""}
        </a>
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
    <article className={`radar-signal ${scoreClass}`}>
      <div className="radar-signal-header">
        <div>
          <span className="text-date radar-signal-date">
            {formatDate(signal.event_date)}
          </span>
          <SignalBadge capturedAt={signal.captured_at} />
          <CategoryBadge category={signal.category} />
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
      <a
        href={signal.source_url}
        className="text-source-url radar-signal-source"
        target="_blank"
        rel="noopener noreferrer"
      >
        {signal.source_url.replace(/^https?:\/\//, "").slice(0, 48)}
        {signal.source_url.length > 56 ? "…" : ""}
      </a>
    </article>
  );
}
