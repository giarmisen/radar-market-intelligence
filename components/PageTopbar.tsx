import type { ReactNode } from "react";

interface PageTopbarProps {
  title: string;
  subtitle: string;
  meta?: string;
  filters?: ReactNode;
}

export function PageTopbar({ title, subtitle, meta, filters }: PageTopbarProps) {
  return (
    <header className="radar-topbar">
      <div className="radar-topbar-header">
        <h1 className="radar-page-title">{title}</h1>
        {meta ? <span className="radar-topbar-meta">{meta}</span> : null}
      </div>
      <p className="radar-page-subtitle">{subtitle}</p>
      {filters ? <div className="radar-topbar-filters">{filters}</div> : null}
    </header>
  );
}
