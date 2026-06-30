"use client";

export type TierFilterValue =
  | "all"
  | "new-today"
  | "0"
  | "1"
  | "2"
  | "worth-watching";

interface FilterPillsProps {
  value: TierFilterValue;
  onChange: (value: TierFilterValue) => void;
  worthWatchingCount?: number;
  /** Timeline, Market Pulse, or Actors registry tier filters. */
  variant?: "timeline" | "market-pulse" | "actors";
  newTodayCount?: number;
}

const TIMELINE_OPTIONS: Array<{ value: TierFilterValue; label: string }> = [
  { value: "all", label: "All tiers" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "worth-watching", label: "Worth Watching" },
];

const ACTORS_OPTIONS: Array<{ value: TierFilterValue; label: string }> = [
  { value: "all", label: "All tiers" },
  { value: "0", label: "Tier 0" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
];

const MARKET_PULSE_OPTIONS: Array<{ value: TierFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "new-today", label: "New Today" },
  { value: "1", label: "Tier 1" },
  { value: "2", label: "Tier 2" },
  { value: "worth-watching", label: "Worth Watching" },
];

export function FilterPills({
  value,
  onChange,
  worthWatchingCount = 0,
  variant = "timeline",
  newTodayCount = 0,
}: FilterPillsProps) {
  const options =
    variant === "market-pulse"
      ? MARKET_PULSE_OPTIONS
      : variant === "actors"
        ? ACTORS_OPTIONS
        : TIMELINE_OPTIONS;

  return (
    <div className="radar-filter-pills" role="group" aria-label="Tier filter">
      {options.map((option) => {
        if (variant !== "actors" && option.value === "new-today" && newTodayCount === 0) {
          return null;
        }

        if (variant !== "actors" && option.value === "worth-watching" && worthWatchingCount === 0) {
          return null;
        }

        const label =
          option.value === "new-today"
            ? `New Today (${newTodayCount})`
            : option.value === "worth-watching" &&
                variant === "timeline" &&
                worthWatchingCount > 0
              ? `${option.label} (${worthWatchingCount})`
              : option.label;

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
            {label}
          </button>
        );
      })}
    </div>
  );
}
