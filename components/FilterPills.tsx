"use client";

export type TierFilterValue = "all" | "1" | "2" | "worth-watching";

interface FilterPillsProps {
  value: TierFilterValue;
  onChange: (value: TierFilterValue) => void;
  worthWatchingCount?: number;
}

const OPTIONS: Array<{ value: TierFilterValue; label: string }> = [
  { value: "all", label: "All tiers" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "worth-watching", label: "Worth Watching" },
];

export function FilterPills({
  value,
  onChange,
  worthWatchingCount = 0,
}: FilterPillsProps) {
  return (
    <div className="radar-filter-pills" role="group" aria-label="Tier filter">
      {OPTIONS.map((option) => {
        if (option.value === "worth-watching" && worthWatchingCount === 0) {
          return null;
        }

        return (
          <button
            key={option.value}
            type="button"
            className={`radar-filter-pill${
              value === option.value ? " radar-filter-pill-active" : ""
            }`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
            {option.value === "worth-watching" && worthWatchingCount > 0
              ? ` (${worthWatchingCount})`
              : ""}
          </button>
        );
      })}
    </div>
  );
}
