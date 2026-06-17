interface StatItem {
  value: number | string;
  label: string;
}

interface StatGridProps {
  stats: StatItem[];
}

export function StatGrid({ stats }: StatGridProps) {
  return (
    <div className="radar-stat-grid">
      {stats.map((stat) => (
        <div key={stat.label} className="radar-stat-card">
          <span className="text-stat-number radar-stat-value">{stat.value}</span>
          <span className="text-stat-label radar-stat-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
