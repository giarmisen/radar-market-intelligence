import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
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

async function clickPillAndExpectActive(
  canvasElement: HTMLElement,
  name: string | RegExp,
) {
  const canvas = within(canvasElement);
  const pill = canvas.getByRole("button", { name });
  await userEvent.click(pill);
  expect(pill).toHaveAttribute("aria-pressed", "true");
  expect(pill).toHaveClass("radar-filter-pill-active");
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await clickPillAndExpectActive(canvasElement, "All tiers");
    await clickPillAndExpectActive(canvasElement, "Tier 1");
    await clickPillAndExpectActive(canvasElement, "Tier 2");
    await clickPillAndExpectActive(canvasElement, /Worth Watching/);
  },
};

export const TierOneActive: Story = {
  args: {
    value: "1",
    worthWatchingCount: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tierOne = canvas.getByRole("button", { name: "Tier 1" });
    expect(tierOne).toHaveAttribute("aria-pressed", "true");
  },
};

export const TierTwoActive: Story = {
  args: {
    value: "2",
    worthWatchingCount: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tierTwo = canvas.getByRole("button", { name: "Tier 2" });
    expect(tierTwo).toHaveAttribute("aria-pressed", "true");
  },
};

export const WorthWatchingActive: Story = {
  args: {
    value: "worth-watching",
    worthWatchingCount: 3,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const worthWatching = canvas.getByRole("button", { name: /Worth Watching/ });
    expect(worthWatching).toHaveAttribute("aria-pressed", "true");
  },
};

export const NoWorthWatching: Story = {
  args: {
    value: "all",
    worthWatchingCount: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByRole("button", { name: /Worth Watching/ })).toBeNull();
    expect(canvas.getByRole("button", { name: "All tiers" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
