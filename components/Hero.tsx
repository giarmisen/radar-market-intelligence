import { Fragment } from "react";

interface HeroStat {
  value: number;
  label: string;
}

interface HeroProps {
  eyebrow: string;
  title: string;
  sub: string;
  stats: HeroStat[];
}

export function Hero({ eyebrow, title, sub, stats }: HeroProps) {
  return (
    <header className="radar-hero">
      <p className="radar-hero-eyebrow">{eyebrow}</p>
      <h1 className="radar-hero-title">{title}</h1>
      <p className="radar-hero-sub">{sub}</p>
      <div className="radar-hero-stats">
        {stats.map((stat, index) => (
          <Fragment key={stat.label}>
            {index > 0 ? <div className="radar-hero-divider" /> : null}
            <div className="radar-hero-stat">
              <span className="radar-hero-stat-value">{stat.value}</span>
              <span className="radar-hero-stat-label">{stat.label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </header>
  );
}
