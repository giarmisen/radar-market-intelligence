import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconActors,
  IconChevronLeft,
  IconChevronRight,
  IconProposals,
  IconPulse,
  IconReport,
  IconTimeline,
} from "./SidebarIcons";

export type SidebarActive =
  | "living"
  | "timeline"
  | "reports"
  | "actors"
  | "proposals";

interface SidebarProps {
  active: SidebarActive;
  pendingProposals: number;
  collapsed: boolean;
  isMobile: boolean;
  onToggleCollapse: () => void;
  onNavigate: () => void;
}

interface NavItem {
  id: SidebarActive;
  href: string;
  label: string;
  icon: ReactNode;
  dividerBefore?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "living", href: "/", label: "Market Pulse", icon: <IconPulse /> },
  { id: "timeline", href: "/timeline", label: "Timeline", icon: <IconTimeline /> },
  { id: "actors", href: "/actors", label: "Actors", icon: <IconActors /> },
  { id: "reports", href: "/reports", label: "Reports", icon: <IconReport /> },
  {
    id: "proposals",
    href: "/proposals",
    label: "Proposals",
    icon: <IconProposals />,
    dividerBefore: true,
  },
];

export function Sidebar({
  active,
  pendingProposals,
  collapsed,
  isMobile,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  const sidebarClassName = [
    "radar-sidebar",
    collapsed ? "radar-sidebar-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sidebarClassName}>
      <Link
        href="/"
        className="radar-sidebar-logo"
        title="Radar"
        onClick={onNavigate}
      >
        <span className="radar-sidebar-logo-text">Radar.</span>
        <span className="radar-sidebar-logo-mark" aria-hidden>
          R.
        </span>
      </Link>
      <div className="radar-sidebar-domain">
        <div className="radar-sidebar-domain-label">Example domain</div>
        <div className="radar-sidebar-domain-name">Language Services & Language AI</div>
      </div>
      <nav className="radar-sidebar-nav" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            {item.dividerBefore ? <div className="radar-sidebar-divider" /> : null}
            <Link
              href={item.href}
              className={`radar-sidebar-item text-nav-item${
                active === item.id ? " radar-sidebar-item-active text-nav-item-active" : ""
              }`}
              aria-current={active === item.id ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
            >
              <span className="radar-sidebar-icon">{item.icon}</span>
              <span className="radar-sidebar-label">{item.label}</span>
              {item.id === "proposals" && pendingProposals > 0 ? (
                <span className="radar-sidebar-badge">{pendingProposals}</span>
              ) : null}
            </Link>
          </div>
        ))}
      </nav>
      {!isMobile ? (
        <button
          type="button"
          className="radar-sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <IconChevronRight />
          ) : (
            <>
              <IconChevronLeft />
              <span className="radar-sidebar-toggle-label">Collapse</span>
            </>
          )}
        </button>
      ) : null}
    </aside>
  );
}
