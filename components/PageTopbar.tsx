"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface PageTopbarProps {
  title: string;
  subtitle: string;
  filters?: ReactNode;
}

function syncTopbarHeight(element: HTMLElement) {
  document.documentElement.style.setProperty(
    "--radar-topbar-height",
    `${element.offsetHeight}px`,
  );
}

export function PageTopbar({ title, subtitle, filters }: PageTopbarProps) {
  const topbarRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const element = topbarRef.current;
    if (!element) {
      return;
    }

    syncTopbarHeight(element);

    const observer = new ResizeObserver(() => {
      syncTopbarHeight(element);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [filters]);

  return (
    <header
      ref={topbarRef}
      className={`radar-topbar${scrolled ? " radar-topbar--scrolled" : ""}`}
    >
      <div className="radar-topbar-header">
        <h1 className="text-page-title radar-page-title">{title}</h1>
      </div>
      <p className="radar-page-subtitle">{subtitle}</p>
      {filters ? <div className="radar-topbar-filters">{filters}</div> : null}
    </header>
  );
}
