"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar, type SidebarActive } from "./Sidebar";
import { IconMenu } from "./SidebarIcons";

const SIDEBAR_STORAGE_KEY = "radar-sidebar-collapsed";
const MOBILE_BREAKPOINT = 767;

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readStoredCollapsed());
    setHydrated(true);

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    const syncViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (mobile) {
        setMobileOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
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

  const shellClassName = [
    "radar-app",
    hydrated && collapsed && !isMobile ? "radar-sidebar-collapsed" : "",
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
        collapsed={collapsed && !isMobile}
        isMobile={isMobile}
        onToggleCollapse={toggleCollapsed}
        onNavigate={closeMobile}
      />

      <div className="radar-main-column">{children}</div>
    </div>
  );
}
