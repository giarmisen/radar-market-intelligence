import type { ResolvedProposalItem } from "@/lib/proposals-page";
import { PROPOSAL_TRIGGER_RULES } from "@/lib/proposals";
import {
  formatDate,
  formatProposalStatus,
  formatProposalType,
} from "@/lib/format";

interface ProposalsEmptyStateProps {
  resolvedProposals: ResolvedProposalItem[];
}

export function ProposalsEmptyState({
  resolvedProposals,
}: ProposalsEmptyStateProps) {
  return (
    <div className="radar-proposals-empty">
      <div className="radar-proposals-empty-intro">
        <p className="text-section-label">No pending proposals</p>
        <p className="text-signal-body">
          Proposals are system-generated suggestions for curating your tracked market.
          They&apos;ll appear here automatically after ingestion when the rules below
          are met.
        </p>
      </div>

      <section className="radar-proposals-empty-section">
        <h2 className="text-section-label">How proposals work</h2>
        <ul className="radar-proposal-rules-list">
          {PROPOSAL_TRIGGER_RULES.map((rule) => (
            <li key={rule.type} className="radar-proposal-rule-item">
              {rule.description}
            </li>
          ))}
        </ul>
      </section>

      {resolvedProposals.length > 0 ? (
        <section className="radar-proposals-empty-section">
          <h2 className="text-section-label">Resolved proposals</h2>
          <div className="radar-proposals-resolved-list">
            {resolvedProposals.map((proposal) => {
              const title =
                proposal.subjectLabel ?? formatProposalType(proposal.type);

              return (
                <article
                  key={proposal.id}
                  className="radar-card radar-proposal-resolved-card"
                >
                  <div className="radar-proposal-resolved-header">
                    <div>
                      <h3 className="radar-proposal-resolved-title">{title}</h3>
                      <p className="radar-proposal-resolved-type">
                        {formatProposalType(proposal.type)}
                      </p>
                    </div>
                    <span
                      className={`radar-proposal-status-badge radar-proposal-status-${proposal.status}`}
                    >
                      {formatProposalStatus(proposal.status)}
                    </span>
                  </div>
                  <p className="radar-proposal-resolved-meta">
                    Resolved {formatDate(proposal.resolved_at.slice(0, 10))}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
