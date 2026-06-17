import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { StatGrid } from "@/components/StatGrid";

const meta = {
  title: "4. Data Display/StatGrid",
  component: StatGrid,
  parameters: {
    docs: {
      description: {
        component:
          "Frosted stat cards showing key counts at the top of Market Pulse and Timeline. Use for at-a-glance domain metrics.",
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
    stats: {
      control: "object",
      description: "Array of stat value/label pairs shown in the grid",
    },
  },
} satisfies Meta<typeof StatGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

async function verifyStats(canvasElement: HTMLElement, expectedLabels: string[]) {
  const canvas = within(canvasElement);
  const values = canvasElement.querySelectorAll(".radar-stat-value");
  expect(values.length).toBe(expectedLabels.length);

  values.forEach((valueEl) => {
    expect(valueEl).toBeVisible();
    const numericValue = Number(valueEl.textContent);
    expect(numericValue).toBeGreaterThan(0);
  });

  for (const label of expectedLabels) {
    const labelEl = canvas.getByText(label);
    expect(labelEl).toBeVisible();
    expect(labelEl).toHaveClass("radar-stat-label");
  }
}

export const Default: Story = {
  args: {
    stats: [
      { value: 47, label: "Signals this week" },
      { value: 18, label: "Tier 1 actors" },
      { value: 6, label: "Critical updates" },
    ],
  },
  play: async ({ canvasElement }) => {
    await verifyStats(canvasElement, [
      "Signals this week",
      "Tier 1 actors",
      "Critical updates",
    ]);
  },
};

export const MarketPulse: Story = {
  args: {
    stats: [
      { value: 6, label: "Actors with signals" },
      { value: 18, label: "Pulse signals" },
      { value: 1, label: "Upcoming events" },
      { value: 3, label: "Worth watching" },
    ],
  },
  play: async ({ canvasElement }) => {
    await verifyStats(canvasElement, [
      "Actors with signals",
      "Pulse signals",
      "Upcoming events",
      "Worth watching",
    ]);
  },
};

export const FourColumns: Story = {
  args: {
    stats: [
      { value: 124, label: "Signals in period" },
      { value: 22, label: "Active actors" },
      { value: 7, label: "Categories" },
      { value: 3, label: "Worth watching" },
    ],
  },
  play: async ({ canvasElement }) => {
    await verifyStats(canvasElement, [
      "Signals in period",
      "Active actors",
      "Categories",
      "Worth watching",
    ]);
  },
};
