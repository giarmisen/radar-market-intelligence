import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorthWatchingSection } from "@/components/WorthWatchingSection";
import { WORTH_WATCHING_SIGNALS } from "../fixtures";

const meta = {
  title: "Data Display/WorthWatchingSection",
  component: WorthWatchingSection,
  parameters: {
    docs: {
      description: {
        component:
          "Surfaces orphan score-3 signals that are not tied to a tracked actor. Use below the actor card grid on Market Pulse.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 480,
          padding: "var(--spacing-card-padding)",
          background: "var(--color-bg-primary)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  argTypes: {
    signals: {
      control: "object",
      description: "Orphan score-3 signals surfaced below the actor card grid",
    },
  },
  args: {
    signals: WORTH_WATCHING_SIGNALS,
  },
} satisfies Meta<typeof WorthWatchingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoItems: Story = {
  args: {
    signals: WORTH_WATCHING_SIGNALS.slice(0, 2),
  },
};

export const SingleItem: Story = {
  args: {
    signals: WORTH_WATCHING_SIGNALS.slice(0, 1),
  },
};
