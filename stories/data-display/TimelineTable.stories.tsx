import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TimelineTable } from "@/components/TimelineTable";
import { timelineRows } from "../fixtures";

const meta = {
  title: "Data Display/TimelineTable",
  component: TimelineTable,
  parameters: {
    docs: {
      description: {
        component:
          "Sortable, filterable signal table with responsive card fallback. Use on the Timeline page for full signal history.",
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
    tierFilter: {
      control: "select",
      options: ["all", "1", "2", "worth-watching"],
      description: "Tier filter applied from the page topbar",
    },
  },
  args: {
    rows: timelineRows(),
    tierFilter: "all",
  },
} satisfies Meta<typeof TimelineTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TierOneFilter: Story = {
  args: {
    tierFilter: "1",
  },
};

export const TierTwoFilter: Story = {
  args: {
    tierFilter: "2",
  },
};

export const Empty: Story = {
  args: {
    rows: [],
  },
};
