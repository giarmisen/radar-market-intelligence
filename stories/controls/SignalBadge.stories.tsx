import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SignalBadge } from "@/components/ui/SignalBadge";
import { recentCapture } from "../fixtures";

const meta = {
  title: "Controls/SignalBadge",
  component: SignalBadge,
  parameters: {
    docs: {
      description: {
        component:
          "Shows a NEW badge when a signal was captured within the recent window. Use alongside dates on signals and timeline rows.",
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
    capturedAt: {
      control: "text",
      description: "ISO capture timestamp — renders NEW badge when within the recent window",
    },
  },
  args: {
    capturedAt: recentCapture(),
  },
} satisfies Meta<typeof SignalBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NotRecent: Story = {
  name: "Hidden (Not Recent)",
  args: {
    capturedAt: "2025-01-15T10:00:00.000Z",
  },
};

export const NoTimestamp: Story = {
  name: "Hidden (No Timestamp)",
  args: {
    capturedAt: null,
  },
};
