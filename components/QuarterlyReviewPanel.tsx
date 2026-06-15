"use client";

import { useCallback, useMemo, useState } from "react";
import {
  defaultReportDateRange,
  type QuarterlyReviewMeta,
} from "@/lib/report-date-range";
import { MarkdownReport } from "./MarkdownReport";

interface QuarterlyReviewPanelProps {
  domainSlug: string;
  domainName: string;
}

function downloadMarkdown(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function QuarterlyReviewPanel({
  domainSlug,
  domainName,
}: QuarterlyReviewPanelProps) {
  const defaults = useMemo(() => defaultReportDateRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [meta, setMeta] = useState<QuarterlyReviewMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainSlug, from, to }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        markdown?: string;
        meta?: QuarterlyReviewMeta;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.markdown || !payload.meta) {
        throw new Error(payload.error ?? "Failed to generate report");
      }

      setMarkdown(payload.markdown);
      setMeta(payload.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [domainSlug, from, to]);

  const exportReport = useCallback(() => {
    if (!markdown || !meta) {
      return;
    }

    const filename = `radar-review-${meta.domain}-${meta.from}-${meta.to}.md`;
    const header = `# Market Report — ${domainName}\n\nPeriod: ${meta.from} to ${meta.to}\nGenerated: ${meta.generated_at.slice(0, 10)}\nSignals analyzed: ${meta.signal_count}\n\n---\n\n`;
    downloadMarkdown(header + markdown, filename);
  }, [markdown, meta, domainName]);

  return (
    <div className="radar-report-panel">
      <section className="radar-card radar-report-controls">
        <div className="radar-filters radar-report-filters">
          <span className="radar-filter-label">Period</span>
          <label className="radar-report-date-field">
            <span className="radar-report-date-label">From</span>
            <input
              type="date"
              className="radar-filter-control"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              disabled={loading}
            />
          </label>
          <label className="radar-report-date-field">
            <span className="radar-report-date-label">To</span>
            <input
              type="date"
              className="radar-filter-control"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              disabled={loading}
            />
          </label>
        </div>

        <p className="radar-report-helper">
          Reports are not stored — export to keep a copy.
        </p>

        <div className="radar-report-actions">
          <button
            type="button"
            className="radar-btn radar-btn-approve"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Generating…" : markdown ? "Regenerate Review" : "Generate Review"}
          </button>
          {markdown ? (
            <button
              type="button"
              className="radar-btn radar-btn-reject"
              onClick={exportReport}
              disabled={loading}
            >
              Export
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <p className="radar-report-loading">
          Analyzing {domainName} signals and drafting the review…
        </p>
      ) : null}

      {error ? <p className="radar-proposal-error">{error}</p> : null}

      {markdown && !loading ? (
        <section className="radar-card radar-report-output">
          {meta ? (
            <p className="radar-report-meta">
              {meta.signal_count} signal{meta.signal_count === 1 ? "" : "s"} ·{" "}
              {meta.from} → {meta.to}
            </p>
          ) : null}
          <MarkdownReport content={markdown} />
        </section>
      ) : null}
    </div>
  );
}
