import Link from "next/link";
import type { ActorProfilePageData } from "@/lib/actor-profile";
import {
  formatActorStatus,
  formatDate,
  formatRevenueUsd,
  formatRole,
} from "@/lib/format";
import { ActorAnalysisSection } from "./ActorAnalysisSection";
import { SignalItem } from "./SignalItem";

interface ActorProfileDetailProps {
  data: ActorProfilePageData;
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="radar-profile-empty">—</p>;
  }

  return (
    <ul className="radar-profile-tag-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ActorProfileDetail({ data }: ActorProfileDetailProps) {
  const { actor, profile, signals, stats } = data;
  const revenue = profile ? formatRevenueUsd(profile.revenue_usd) : null;

  return (
    <div className="radar-profile-layout">
      <div className="radar-profile-toolbar">
        <Link href="/actors" className="radar-profile-back">
          ← Actors
        </Link>
        <Link href="/actors/compare" className="radar-profile-compare-link">
          Compare actors
        </Link>
      </div>

      <section className="radar-profile-hero-card radar-card">
        <div className="radar-profile-hero-top">
          <div>
            <h2 className="radar-profile-name">{actor.name}</h2>
            <p className="radar-card-meta">
              {formatRole(actor.role)} · Tier {actor.tier}
              {actor.geography?.length ? ` · ${actor.geography.join(", ")}` : ""}
              {profile?.hq ? ` · HQ ${profile.hq}` : ""}
            </p>
          </div>
          <span className="radar-profile-status">{formatActorStatus(actor.status)}</span>
        </div>

        {profile?.description ? (
          <p className="radar-profile-lead">{profile.description}</p>
        ) : (
          <p className="radar-profile-empty">
            No profile seeded yet. Run{" "}
            <code>npx tsx scripts/seed-profiles.ts</code>.
          </p>
        )}

        <div className="radar-profile-stat-row">
          <div className="radar-profile-stat">
            <span className="radar-profile-stat-value">{stats.signals}</span>
            <span className="radar-profile-stat-label">Signals</span>
          </div>
          <div className="radar-profile-stat">
            <span className="radar-profile-stat-value">{stats.critical}</span>
            <span className="radar-profile-stat-label">Critical</span>
          </div>
          {revenue ? (
            <div className="radar-profile-stat">
              <span className="radar-profile-stat-value">{revenue}</span>
              <span className="radar-profile-stat-label">
                Revenue{profile?.revenue_year ? ` (${profile.revenue_year})` : ""}
              </span>
            </div>
          ) : null}
          {profile?.headcount_approx ? (
            <div className="radar-profile-stat">
              <span className="radar-profile-stat-value">
                {profile.headcount_approx}
              </span>
              <span className="radar-profile-stat-label">Headcount</span>
            </div>
          ) : null}
        </div>
      </section>

      {profile ? (
        <div className="radar-profile-grid">
          <section className="radar-card radar-profile-section">
            <h3 className="radar-section-label">Business model</h3>
            <p className="radar-profile-text">{profile.business_model}</p>
          </section>

          <section className="radar-card radar-profile-section">
            <h3 className="radar-section-label">AI strategy</h3>
            <p className="radar-profile-text">{profile.ai_strategy}</p>
          </section>

          <section className="radar-card radar-profile-section">
            <h3 className="radar-section-label">Recent moves</h3>
            <p className="radar-profile-text">{profile.recent_moves}</p>
          </section>

          <section className="radar-card radar-profile-section">
            <h3 className="radar-section-label">Core products</h3>
            <TagList items={profile.core_products} />
          </section>

          <section className="radar-card radar-profile-section">
            <h3 className="radar-section-label">Core technology</h3>
            <TagList items={profile.core_technology} />
          </section>

          <section className="radar-card radar-profile-section">
            <h3 className="radar-section-label">Key markets</h3>
            <TagList items={profile.key_markets} />
          </section>
        </div>
      ) : null}

      <ActorAnalysisSection
        actorSlug={data.actor.slug}
        domainSlug={data.domainSlug}
      />

      <section className="radar-profile-signals">
        <div className="radar-profile-signals-header">
          <h3 className="radar-section-label">Signals</h3>
          {profile?.updated_at ? (
            <span className="radar-signal-date">
              Profile updated {formatDate(profile.updated_at.slice(0, 10))}
            </span>
          ) : null}
        </div>

        {signals.length === 0 ? (
          <p className="radar-empty">No signals linked to this actor yet.</p>
        ) : (
          <div className="radar-profile-signal-list">
            {signals.map((signal) => (
              <SignalItem
                key={signal.id}
                signal={{
                  ...signal,
                  title: signal.title,
                  actor_names: [actor.name],
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
