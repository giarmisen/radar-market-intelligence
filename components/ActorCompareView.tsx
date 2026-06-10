"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  ActorCompareOption,
  ActorProfilePageData,
} from "@/lib/actor-profile";
import { actorProfileHref } from "@/lib/actor-slug";
import {
  formatActorStatus,
  formatRevenueUsd,
  formatRole,
} from "@/lib/format";

interface ActorCompareViewProps {
  options: ActorCompareOption[];
  profiles: ActorProfilePageData[];
}

const MAX_SELECTION = 3;

function CompareColumn({ data }: { data: ActorProfilePageData }) {
  const { actor, profile } = data;
  const revenue = profile ? formatRevenueUsd(profile.revenue_usd) : null;

  return (
    <article className="radar-compare-column radar-card">
      <header className="radar-compare-column-header">
        <Link href={actorProfileHref(actor.name)} className="radar-profile-name">
          {actor.name}
        </Link>
        <p className="radar-card-meta">
          {formatRole(actor.role)} · Tier {actor.tier}
        </p>
        <p className="radar-compare-status">{formatActorStatus(actor.status)}</p>
      </header>

      {!profile ? (
        <p className="radar-profile-empty">No profile available.</p>
      ) : (
        <div className="radar-compare-fields">
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Overview</h4>
            <p className="radar-profile-text">{profile.description}</p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Business model</h4>
            <p className="radar-profile-text">{profile.business_model}</p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">HQ</h4>
            <p className="radar-profile-text">{profile.hq ?? "—"}</p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Headcount</h4>
            <p className="radar-profile-text">{profile.headcount_approx ?? "—"}</p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Revenue</h4>
            <p className="radar-profile-text">
              {revenue
                ? `${revenue}${profile.revenue_year ? ` (${profile.revenue_year})` : ""}`
                : "—"}
            </p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">AI strategy</h4>
            <p className="radar-profile-text">{profile.ai_strategy}</p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Recent moves</h4>
            <p className="radar-profile-text">{profile.recent_moves}</p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Core products</h4>
            <p className="radar-profile-text">
              {profile.core_products.length > 0
                ? profile.core_products.join(" · ")
                : "—"}
            </p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Core technology</h4>
            <p className="radar-profile-text">
              {profile.core_technology.length > 0
                ? profile.core_technology.join(" · ")
                : "—"}
            </p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Key markets</h4>
            <p className="radar-profile-text">
              {profile.key_markets.length > 0
                ? profile.key_markets.join(" · ")
                : "—"}
            </p>
          </div>
          <div className="radar-compare-field">
            <h4 className="radar-compare-label">Signals</h4>
            <p className="radar-profile-text">{data.stats.signals} total</p>
          </div>
        </div>
      )}
    </article>
  );
}

export function ActorCompareView({ options, profiles }: ActorCompareViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = useMemo(
    () => searchParams.getAll("actor").slice(0, MAX_SELECTION),
    [searchParams],
  );
  const [selected, setSelected] = useState<string[]>(initial);

  function toggleActor(slug: string) {
    setSelected((current) => {
      if (current.includes(slug)) {
        return current.filter((value) => value !== slug);
      }
      if (current.length >= MAX_SELECTION) {
        return current;
      }
      return [...current, slug];
    });
  }

  function applySelection() {
    const params = new URLSearchParams();
    for (const slug of selected) {
      params.append("actor", slug);
    }
    const query = params.toString();
    router.push(query ? `/actors/compare?${query}` : "/actors/compare");
  }

  return (
    <div className="radar-compare-layout">
      <div className="radar-profile-toolbar">
        <Link href="/actors" className="radar-profile-back">
          ← Actors
        </Link>
      </div>

      <section className="radar-card radar-compare-picker">
        <h3 className="radar-section-label">Select actors (2–3)</h3>
        <p className="radar-compare-hint">
          Choose Tier 1 actors with profiles to compare side by side.
        </p>
        <div className="radar-compare-options">
          {options.map((option) => {
            const checked = selected.includes(option.slug);
            const disabled =
              !option.hasProfile ||
              (!checked && selected.length >= MAX_SELECTION);

            return (
              <label
                key={option.slug}
                className={`radar-compare-option${checked ? " radar-compare-option-checked" : ""}${disabled && !checked ? " radar-compare-option-disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleActor(option.slug)}
                />
                <span>{option.name}</span>
                {!option.hasProfile ? (
                  <span className="radar-compare-option-note">No profile</span>
                ) : null}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          className="radar-filter-reset"
          onClick={applySelection}
          disabled={selected.length < 2}
        >
          Compare {selected.length > 0 ? `(${selected.length})` : ""}
        </button>
      </section>

      {profiles.length >= 2 ? (
        <div
          className={`radar-compare-grid radar-compare-grid-${profiles.length}`}
        >
          {profiles.map((profile) => (
            <CompareColumn key={profile.actor.id} data={profile} />
          ))}
        </div>
      ) : (
        <p className="radar-empty">
          Select at least two actors with profiles, then click Compare.
        </p>
      )}
    </div>
  );
}
