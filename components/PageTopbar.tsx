import type { ReactNode } from "react";

interface PageTopbarProps {
  title: string;
  subtitle: string;
  filters?: ReactNode;
}

export function PageTopbar({ title, subtitle, filters }: PageTopbarProps) {
  return (
    <header className="radar-topbar">
      <div className="radar-topbar-header">
        <h1 className="text-page-title radar-page-title">{title}</h1>
      </div>
      <p className="radar-page-subtitle">{subtitle}</p>
      {filters ? <div className="radar-topbar-filters">{filters}</div> : null}
    </header>
  );
}
