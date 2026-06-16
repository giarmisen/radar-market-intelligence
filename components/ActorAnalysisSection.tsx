"use client";

import { useCallback, useState } from "react";
import type { ActorAnalysisResult } from "@/lib/actor-analysis";
import { formatDate } from "@/lib/format";

interface ActorAnalysisSectionProps {
  actorSlug: string;
  domainSlug: string;
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="radar-profile-empty">—</p>;
  }

  return (
    <ul className="radar-analysis-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SwotCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "strength" | "weakness" | "opportunity" | "threat";
}) {
  return (
    <section className={`radar-card radar-analysis-swot-card radar-analysis-swot-${tone}`}>
      <h4 className="radar-analysis-swot-title">{title}</h4>
      <BulletList items={items} />
    </section>
  );
}

function AnalysisReport({ report }: { report: ActorAnalysisResult }) {
  return (
    <div className="radar-analysis-report">
      <div className="radar-analysis-meta">
        <span>
          Generated {formatDate(report.generated_at.slice(0, 10))} ·{" "}
          {report.signal_count} signal{report.signal_count === 1 ? "" : "s"} used
        </span>
      </div>

      <section className="radar-card radar-analysis-section">
        <h3 className="radar-section-label">SWOT analysis</h3>
        <div className="radar-analysis-swot-grid">
          <SwotCard title="Strengths" items={report.swot.strengths} tone="strength" />
          <SwotCard title="Weaknesses" items={report.swot.weaknesses} tone="weakness" />
          <SwotCard
            title="Opportunities"
            items={report.swot.opportunities}
            tone="opportunity"
          />
          <SwotCard title="Threats" items={report.swot.threats} tone="threat" />
        </div>
      </section>

      <section className="radar-card radar-analysis-section">
        <h3 className="radar-section-label">AI strategy assessment</h3>
        {report.ai_strategy_assessment.split(/\n\n+/).map((paragraph, index) => (
          <p key={index} className="radar-analysis-prose">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="radar-card radar-analysis-section">
        <h3 className="radar-section-label">Product map</h3>
        {report.product_map.length === 0 ? (
          <p className="radar-profile-empty">—</p>
        ) : (
          <div className="radar-analysis-product-list">
            {report.product_map.map((product) => (
              <article key={product.name} className="radar-analysis-product-item">
                <h4 className="radar-analysis-product-name">{product.name}</h4>
                <p className="radar-profile-text">{product.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="radar-analysis-grid">
        <section className="radar-card radar-analysis-section">
          <h3 className="radar-section-label">Market opportunities</h3>
          <BulletList items={report.market_opportunities} />
        </section>

        <section className="radar-card radar-analysis-section">
          <h3 className="radar-section-label">Key risks</h3>
          <BulletList items={report.key_risks} />
        </section>
      </div>
    </div>
  );
}

export function ActorAnalysisSection({
  actorSlug,
  domainSlug,
}: ActorAnalysisSectionProps) {
  const [report, setReport] = useState<ActorAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analysis/${actorSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainSlug }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        report?: ActorAnalysisResult;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.report) {
        throw new Error(payload.error ?? "Failed to generate analysis");
      }

      setReport(payload.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  }, [actorSlug, domainSlug]);

  return (
    <section className="radar-analysis-block">
      <div className="radar-profile-signals-header">
        <h3 className="radar-section-label">Strategic analysis</h3>
        <div className="radar-analysis-actions">
          <button
            type="button"
            className={`radar-btn ${report ? "radar-btn-reject" : "radar-btn-approve"}`}
            onClick={generate}
            disabled={loading}
          >
            {report ? "Regenerate" : "Generate Report"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="radar-analysis-loading">Generating analysis...</p>
      ) : null}

      {error ? <p className="radar-proposal-error">{error}</p> : null}

      {!loading && !report && !error ? (
        <p className="radar-profile-empty">
          Generate an AI-powered strategic report from this actor&apos;s profile and
          linked signals.
        </p>
      ) : null}

      {report && !loading ? <AnalysisReport report={report} /> : null}
    </section>
  );
}
