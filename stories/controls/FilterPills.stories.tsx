import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { fn } from "storybook/test";
import { FilterPills, type TierFilterValue } from "@/components/FilterPills";

/**
 * Interactive wrapper so tier filter controls work in Storybook.
 * Use on Market Pulse and Timeline pages to filter actor tiers and worth-watching signals.
 */
function FilterPillsDemo({
  value,
  worthWatchingCount,
  onChange,
}: {
  value: TierFilterValue;
  worthWatchingCount: number;
  onChange: (value: TierFilterValue) => void;
}) {
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  return (
    <FilterPills
      value={current}
      onChange={(next) => {
        setCurrent(next);
        onChange(next);
      }}
      worthWatchingCount={worthWatchingCount}
    />
  );
}

const meta = {
  title: "3. Controls/FilterPills",
  component: FilterPillsDemo,
  parameters: {
    docs: {
      description: {
        component:
          "Tier filter pill group for Market Pulse and Timeline. Use in PageTopbar to filter actor tiers and worth-watching signals.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: {
      control: "select",
      options: ["all", "1", "2", "worth-watching"],
      description: "Active tier filter selection",
    },
    worthWatchingCount: {
      control: { type: "number", min: 0 },
      description: "Number of worth-watching signals — hides pill when zero",
    },
    onChange: { action: "changed" },
  },
  args: {
    value: "all",
    worthWatchingCount: 3,
    onChange: fn(),
  },
} satisfies Meta<typeof FilterPillsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TierOneActive: Story = {
  args: {
    value: "1",
    worthWatchingCount: 3,
  },
};

export const TierTwoActive: Story = {
  args: {
    value: "2",
    worthWatchingCount: 3,
  },
};

export const WorthWatchingActive: Story = {
  args: {
    value: "worth-watching",
    worthWatchingCount: 3,
  },
};

export const NoWorthWatching: Story = {
  args: {
    value: "all",
    worthWatchingCount: 0,
  },
};
