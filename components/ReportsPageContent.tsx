"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  defaultReportDateRange,
  type QuarterlyReviewMeta,
} from "@/lib/report-date-range";
import { MarkdownReport } from "./MarkdownReport";
import { PageTopbar } from "./PageTopbar";
import { ReportSkeleton } from "./ReportSkeleton";

interface ReportsPageContentProps {
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

export function ReportsPageContent({
  domainSlug,
  domainName,
}: ReportsPageContentProps) {
  const defaults = useMemo(() => defaultReportDateRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [meta, setMeta] = useState<QuarterlyReviewMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef(0);

  const cancelGenerate = useCallback(() => {
    generationIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setError(null);
  }, []);

  const generate = useCallback(async () => {
    const generationId = ++generationIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainSlug, from, to }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as {
        ok: boolean;
        markdown?: string;
        meta?: QuarterlyReviewMeta;
        error?: string;
      };

      if (generationId !== generationIdRef.current) {
        return;
      }

      if (!response.ok || !payload.ok || !payload.markdown || !payload.meta) {
        throw new Error(payload.error ?? "Failed to generate report");
      }

      setMarkdown(payload.markdown);
      setMeta(payload.meta);
    } catch (err) {
      if (generationId !== generationIdRef.current) {
        return;
      }
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      if (generationId === generationIdRef.current) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, [domainSlug, from, to]);

  const exportReport = useCallback(() => {
    if (!markdown || !meta) {
      return;
    }

    const filename = `radar-review-${meta.domain}-${meta.from}-${meta.to}.md`;
    const header = `# Market Report: ${domainName}\n\nPeriod: ${meta.from} to ${meta.to}\nGenerated: ${meta.generated_at.slice(0, 10)}\nSignals analyzed: ${meta.signal_count}\n\n---\n\n`;
    downloadMarkdown(header + markdown, filename);
  }, [markdown, meta, domainName]);

  const showSkeleton = !markdown || loading;
  const showReport = Boolean(markdown && !loading);

  return (
    <>
      <PageTopbar
        title="Market Report"
        subtitle="Generate an on-demand analyst briefing from signals in any date range."
        filters={
          <div className="radar-report-topbar">
            <div className="radar-report-topbar-controls">
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
              <button
                type="button"
                className={loading ? "btn-secondary" : "btn-primary"}
                onClick={loading ? cancelGenerate : generate}
              >
                {loading
                  ? "Cancel"
                  : markdown
                    ? "Regenerate Report"
                    : "Generate Report"}
              </button>
              {markdown ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={exportReport}
                  disabled={loading}
                >
                  Export
                </button>
              ) : null}
            </div>
          </div>
        }
      />
      <div className="radar-content">
        {error ? <p className="radar-proposal-error">{error}</p> : null}

        {showSkeleton ? (
          <>
            {loading ? (
              <p className="radar-report-loading" aria-live="polite">
                Analyzing {domainName} signals and drafting the review…
              </p>
            ) : null}
            <ReportSkeleton loading={loading} />
          </>
        ) : null}

        {showReport && markdown ? (
          <section className="radar-card radar-report-output radar-report-output-enter">
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
    </>
  );
}
