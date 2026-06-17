import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { SIGNAL_CATEGORIES } from "../fixtures";

const meta = {
  title: "3. Controls/CategoryBadge",
  component: CategoryBadge,
  parameters: {
    docs: {
      description: {
        component:
          "Color-coded label for signal intelligence categories. Use on signal items, timeline rows, and filter results.",
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
    category: {
      control: "select",
      options: SIGNAL_CATEGORIES,
      description: "Signal intelligence category (product, regulatory, commercial, etc.)",
    },
    className: {
      control: "text",
      description: "Optional extra class names for layout contexts like timeline pills",
    },
  },
  args: {
    category: "product",
  },
} satisfies Meta<typeof CategoryBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText("Product");
    expect(badge).toBeVisible();
    expect(badge).toHaveClass("cat-product");
    await userEvent.hover(badge);
    expect(badge).toBeVisible();
    expect(badge).toHaveClass("radar-category-badge");
  },
};

export const Regulatory: Story = {
  args: { category: "regulatory" },
};

export const Commercial: Story = {
  args: { category: "commercial" },
};

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-stat-gap)" }}>
      {SIGNAL_CATEGORIES.map((category) => (
        <CategoryBadge key={category} category={category} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badges = canvas.getAllByText(/./);
    expect(badges.length).toBeGreaterThanOrEqual(SIGNAL_CATEGORIES.length);
  },
};
