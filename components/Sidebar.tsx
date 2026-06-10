import type { TierSection } from "@/lib/living-document";

interface SidebarProps {
  tiers: TierSection[];
}

export function Sidebar({ tiers }: SidebarProps) {
  return (
    <aside className="radar-sidebar">
      <div className="radar-sidebar-section">
        <div className="radar-sidebar-label">Tiers</div>
        {tiers.map((tier) => (
          <a
            key={tier.tier}
            href={`#tier-${tier.tier}`}
            className="radar-sidebar-item"
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
        ))}
      </div>
    </aside>
  );
}
