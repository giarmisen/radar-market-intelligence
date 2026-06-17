import type { SignalCategory } from "@/lib/types";
import { formatCategory } from "@/lib/format";

interface CategoryBadgeProps {
  category: SignalCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const classes = ["radar-category-badge", `cat-${category}`, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{formatCategory(category)}</span>;
}
