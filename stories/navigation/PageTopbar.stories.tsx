import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { expect, userEvent, within } from "storybook/test";
import { FilterPills, type TierFilterValue } from "@/components/FilterPills";
import { PageTopbar } from "@/components/PageTopbar";

function PageTopbarWithFilters({
  title,
  subtitle,
}: Pick<ComponentProps<typeof PageTopbar>, "title" | "subtitle">) {
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("all");

  return (
    <PageTopbar
      title={title}
      subtitle={subtitle}
      filters={
        <FilterPills
          value={tierFilter}
          onChange={setTierFilter}
          worthWatchingCount={3}
        />
      }
    />
  );
}

const meta = {
  title: "2. Navigation/PageTopbar",
  component: PageTopbar,
  parameters: {
    docs: {
      description: {
        component:
          "Page header with title, subtitle, and optional filter slot. Use at the top of every main content view.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: "var(--color-bg-primary)" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: {
      control: "text",
      description: "Primary page heading shown in the topbar",
    },
    subtitle: {
      control: "text",
      description: "Supporting description below the page title",
    },
    filters: {
      control: false,
      description: "Optional filter controls rendered below the subtitle",
    },
  },
} satisfies Meta<typeof PageTopbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Market Pulse",
    subtitle:
      "Today's signals, upcoming events, and recent market activity by tier.",
  },
  render: (args) => <PageTopbarWithFilters {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { name: "Market Pulse" })).toBeVisible();
    expect(
      canvas.getByText(/Today's signals, upcoming events/),
    ).toBeVisible();

    const tierOne = canvas.getByRole("button", { name: "Tier 1" });
    await userEvent.click(tierOne);
    expect(tierOne).toHaveAttribute("aria-pressed", "true");
    expect(tierOne).toHaveClass("radar-filter-pill-active");

    const allTiers = canvas.getByRole("button", { name: "All tiers" });
    await userEvent.click(allTiers);
    expect(allTiers).toHaveAttribute("aria-pressed", "true");
  },
};

export const WithoutFilters: Story = {
  args: {
    title: "Actors",
    subtitle:
      "Tracked actor registry: tier, role, geography, and lifecycle status.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { name: "Actors" })).toBeVisible();
    expect(canvas.getByText(/Tracked actor registry/)).toBeVisible();
  },
};

export const Timeline: Story = {
  args: {
    title: "Timeline",
    subtitle: "Full signal history. Filter by tier, category, actor, relevance, and date.",
    filters: <FilterPills value="1" onChange={() => undefined} worthWatchingCount={3} />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { name: "Timeline" })).toBeVisible();
    expect(canvas.getByRole("button", { name: "Tier 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
