"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProposalItem, ResolvedProposalItem } from "@/lib/proposals-page";
import { formatDate, formatDateTime, formatProposalType } from "@/lib/format";
import { ProposalsEmptyState } from "./ProposalsEmptyState";

interface ProposalsQueueProps {
  proposals: ProposalItem[];
  resolvedProposals: ResolvedProposalItem[];
}

export function ProposalsQueue({
  proposals: initial,
  resolvedProposals,
}: ProposalsQueueProps) {
  const router = useRouter();
  const [proposals, setProposals] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function resolve(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const response = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Request failed");
      }

      setProposals((current) => current.filter((proposal) => proposal.id !== id));
      router.refresh();
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : "Unknown error",
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (proposals.length === 0) {
    return <ProposalsEmptyState resolvedProposals={resolvedProposals} />;
  }

  return (
    <div className="radar-proposals-list">
      {proposals.map((proposal) => (
        <article key={proposal.id} className="radar-proposal-card">
          <div className="radar-proposal-header">
            <span className="radar-proposal-type">
              {formatProposalType(proposal.type)}
            </span>
            <span className="radar-proposal-meta">
              Proposed {formatDateTime(proposal.created_at)}
            </span>
          </div>

          {proposal.subjectLabel ? (
            <h2 className="radar-proposal-subject">
              {proposal.subjectLabel}
              {proposal.subjectMeta ? (
                <span className="radar-proposal-subject-meta">
                  {proposal.subjectMeta}
                </span>
              ) : null}
            </h2>
          ) : null}

          <p className="radar-proposal-rationale">{proposal.rationale}</p>

          {proposal.evidence.length > 0 ? (
            <>
              <p className="radar-proposal-evidence-label">Evidence signals</p>
              <div className="radar-proposal-evidence">
                {proposal.evidence.map((signal) => (
                  <a
                    key={signal.id}
                    href={signal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="radar-evidence-item"
                  >
                    <p className="radar-evidence-title">{signal.title}</p>
                    <p className="radar-evidence-summary">{signal.summary}</p>
                    <div className="radar-evidence-meta">
                      <span
                        className={`radar-score-badge ${
                          signal.relevance === 3
                            ? "radar-score-3"
                            : "radar-score-2"
                        }`}
                      >
                        {signal.relevance}
                      </span>
                      <span>{formatDate(signal.event_date)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : null}

          <div className="radar-proposal-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={loadingId === proposal.id}
              onClick={() => resolve(proposal.id, "approve")}
            >
              Approve
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loadingId === proposal.id}
              onClick={() => resolve(proposal.id, "reject")}
            >
              Reject
            </button>
          </div>

          {errors[proposal.id] ? (
            <p className="radar-proposal-error">{errors[proposal.id]}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
