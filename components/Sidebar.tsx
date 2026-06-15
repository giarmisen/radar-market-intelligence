"use client";

import { Fragment, useEffect, useState } from "react";
import type { TierSection } from "@/lib/living-document";

interface SidebarProps {
  tiers: TierSection[];
  worthWatchingCount: number;
}

function WorthWatchingNavItem({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  return (
    <a
      href="#worth-watching"
      className={`radar-sidebar-item${active ? " radar-sidebar-item-active" : ""}`}
      aria-current={active ? "location" : undefined}
    >
      <span className="radar-tier-dot radar-tier-dot-worth-watching" />
      <span>Worth Watching</span>
      <span
        className={`radar-sidebar-count ${
          count > 0
            ? "radar-sidebar-count-worth-watching"
            : "radar-sidebar-count-zero"
        }`}
      >
        {count}
      </span>
    </a>
  );
}

export function Sidebar({ tiers, worthWatchingCount }: SidebarProps) {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const worthWatchingActive = hash === "#worth-watching";
  const hasTier2 = tiers.some((tier) => tier.tier === 2);

  return (
    <aside className="radar-sidebar">
      <div className="radar-sidebar-section">
        <div className="radar-sidebar-label">Tiers</div>
        {tiers.map((tier) => (
          <Fragment key={tier.tier}>
            <a
              href={`#tier-${tier.tier}`}
              className={`radar-sidebar-item${
                hash === `#tier-${tier.tier}` ? " radar-sidebar-item-active" : ""
              }`}
              aria-current={hash === `#tier-${tier.tier}` ? "location" : undefined}
            >
              <span
                className={`radar-tier-dot radar-tier-dot-${tier.tier}`}
              />
              <span>Tier {tier.tier}</span>
              <span
                className={`radar-sidebar-count ${
                  tier.actors.length > 0
                    ? "radar-sidebar-count-active"
                    : "radar-sidebar-count-zero"
                }`}
              >
                {tier.actors.length}
              </span>
            </a>
            {tier.tier === 2 && worthWatchingCount > 0 ? (
              <WorthWatchingNavItem
                count={worthWatchingCount}
                active={worthWatchingActive}
              />
            ) : null}
          </Fragment>
        ))}
        {worthWatchingCount > 0 && !hasTier2 ? (
          <WorthWatchingNavItem
            count={worthWatchingCount}
            active={worthWatchingActive}
          />
        ) : null}
      </div>
    </aside>
  );
}
