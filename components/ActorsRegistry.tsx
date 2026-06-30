import Link from "next/link";
import type { ActorsPageData } from "@/lib/actors-page";
import { actorProfileHref } from "@/lib/actor-slug";
import {
  formatActorStatus,
  formatProposalType,
  formatRole,
} from "@/lib/format";
import type { TierFilterValue } from "./FilterPills";

interface ActorsRegistryProps {
  data: ActorsPageData;
  tierFilter?: TierFilterValue;
}

function statusClassName(status: string): string {
  if (status === "active") {
    return "radar-status-active";
  }
  if (status === "candidate") {
    return "radar-status-candidate";
  }
  return "radar-status-archived";
}

export function ActorsRegistry({ data, tierFilter = "all" }: ActorsRegistryProps) {
  const filteredTiers =
    tierFilter === "all"
      ? data.tiers
      : data.tiers.filter((tier) => tier.tier === Number(tierFilter));

  if (filteredTiers.length === 0) {
    return (
      <p className="radar-empty">No actors in this tier.</p>
    );
  }

  return (
    <>
      {filteredTiers.map((tier) => (
        <section key={tier.tier} className="radar-tier-section">
          <div className="radar-actors-section-header">
            <h2 className="radar-section-label text-section-label">{tier.label}</h2>
            {tier.tier === 1 ? (
              <Link href="/actors/compare" className="radar-profile-compare-link">
                Compare actors →
              </Link>
            ) : null}
          </div>
          <div className="radar-table-wrap">
            <table className="radar-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Tier</th>
                  <th>Geography</th>
                  <th>Status</th>
                  <th>Proposals</th>
                </tr>
              </thead>
              <tbody>
                {tier.actors.map((actor) => (
                  <tr key={actor.id}>
                    <td>
                      <Link
                        href={actorProfileHref(actor.name)}
                        className="text-actor-name radar-card-name radar-table-actor-link"
                      >
                        {actor.name}
                      </Link>
                    </td>
                    <td>{formatRole(actor.role)}</td>
                    <td>
                      <span
                        className={`radar-tier-badge${actor.tier === 2 || actor.tier === 0 ? " radar-tier-badge-2" : ""}`}
                      >
                        Tier {actor.tier}
                      </span>
                    </td>
                    <td>
                      {actor.geography && actor.geography.length > 0
                        ? actor.geography.join(", ")
                        : "—"}
                    </td>
                    <td>
                      <span className={statusClassName(actor.status)}>
                        {formatActorStatus(actor.status)}
                      </span>
                    </td>
                    <td>
                      {actor.pendingProposal ? (
                        <div className="radar-proposal-flag">
                          <span className="radar-proposal-flag-type">
                            {formatProposalType(actor.pendingProposal.type)}
                          </span>
                          <span className="radar-proposal-flag-text">
                            {actor.pendingProposal.rationale}
                          </span>
                          <Link
                            href="/proposals"
                            className="text-source-url radar-table-link radar-nowrap"
                          >
                            Review →
                          </Link>
                        </div>
                      ) : (
                        <span className="text-date radar-signal-date">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
