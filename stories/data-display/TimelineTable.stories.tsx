import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { EMPTY_TIMELINE_FILTERS } from "@/components/TimelineFilters";
import { TimelineTable } from "@/components/TimelineTable";
import { timelineRows } from "../fixtures";

const meta = {
  title: "4. Data Display/TimelineTable",
  component: TimelineTable,
  parameters: {
    docs: {
      description: {
        component:
          "Sortable signal table with responsive card fallback. Filters live in PageTopbar via TimelineFilters on the Timeline page.",
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
    rows: {
      control: "object",
      description: "Timeline signal rows with actors, scores, and source URLs",
    },
    filters: {
      control: "object",
      description: "Active timeline filters (managed by TimelineFilters in the page topbar)",
    },
  },
  args: {
    rows: timelineRows(),
    filters: EMPTY_TIMELINE_FILTERS,
  },
} satisfies Meta<typeof TimelineTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
  },
};

export const WorthWatchingFilter: Story = {
  args: {
    filters: { ...EMPTY_TIMELINE_FILTERS, tier: "worth-watching" },
  },
};

export const Empty: Story = {
  args: {
    rows: [],
    filters: EMPTY_TIMELINE_FILTERS,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emptyMessages = canvas.getAllByText("No signals match the current filters.");
    expect(emptyMessages.length).toBeGreaterThan(0);
    expect(emptyMessages[0]).toBeVisible();
  },
};
