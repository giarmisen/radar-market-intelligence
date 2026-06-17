import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { TimelineTable } from "@/components/TimelineTable";
import { timelineRows } from "../fixtures";

const meta = {
  title: "4. Data Display/TimelineTable",
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = canvasElement.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);

    const categorySelect = canvas.getByLabelText("Filter by category");
    expect(categorySelect).toBeVisible();
    const countBefore = canvas.getByText(/\d+ of \d+ signals/).textContent;
    await userEvent.selectOptions(categorySelect, "product");
    const countAfter = canvas.getByText(/\d+ of \d+ signals/).textContent;
    expect(countAfter).toBeDefined();
    expect(categorySelect).toHaveValue("product");
    expect(countAfter).not.toBe(countBefore);

    const fromDate = canvas.getByLabelText("From date");
    const toDate = canvas.getByLabelText("To date");
    expect(fromDate).toBeVisible();
    expect(toDate).toBeVisible();
    expect(fromDate).toHaveAttribute("type", "date");
    expect(toDate).toHaveAttribute("type", "date");
  },
};

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emptyMessages = canvas.getAllByText("No signals match the current filters.");
    expect(emptyMessages.length).toBeGreaterThan(0);
    expect(emptyMessages[0]).toBeVisible();
  },
};
