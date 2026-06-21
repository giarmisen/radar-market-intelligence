"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar, type SidebarActive } from "./Sidebar";
import { IconMenu } from "./SidebarIcons";

const SIDEBAR_STORAGE_KEY = "radar-sidebar-collapsed";
const MOBILE_BREAKPOINT = 767;
const TABLET_MAX_BREAKPOINT = 1024;

interface AppShellProps {
  active: SidebarActive;
  pendingProposals: number;
  children: ReactNode;
}

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

export function AppShell({ active, pendingProposals, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readStoredCollapsed());
    setHydrated(true);

    const syncViewport = () => {
      const width = window.innerWidth;
      const mobile = width <= MOBILE_BREAKPOINT;
      const tablet = width > MOBILE_BREAKPOINT && width <= TABLET_MAX_BREAKPOINT;

      setIsMobile(mobile);
      setIsTablet(tablet);
      if (mobile) {
        setMobileOpen(false);
      }
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const visuallyCollapsed = !isMobile && (isTablet || collapsed);

  const shellClassName = [
    "radar-app",
    hydrated && visuallyCollapsed ? "radar-sidebar-collapsed" : "",
    mobileOpen ? "radar-sidebar-mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      {isMobile ? (
        <button
          type="button"
          className="radar-sidebar-mobile-trigger"
          onClick={openMobile}
          aria-label="Open navigation menu"
        >
          <IconMenu />
        </button>
      ) : null}

      <button
        type="button"
        className="radar-sidebar-backdrop"
        onClick={closeMobile}
        aria-label="Close navigation menu"
        tabIndex={mobileOpen ? 0 : -1}
      />

      <Sidebar
        active={active}
        pendingProposals={pendingProposals}
        collapsed={visuallyCollapsed}
        isMobile={isMobile}
        onToggleCollapse={toggleCollapsed}
        onNavigate={closeMobile}
      />

      <div className="radar-main-column">{children}</div>
    </div>
  );
}
