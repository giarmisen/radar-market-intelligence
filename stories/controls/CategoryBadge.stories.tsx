import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { SIGNAL_CATEGORIES } from "../fixtures";

const meta = {
  title: "Controls/CategoryBadge",
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

export const Default: Story = {};

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
};
