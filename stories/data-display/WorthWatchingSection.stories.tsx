import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { WorthWatchingSection } from "@/components/WorthWatchingSection";
import { WORTH_WATCHING_SIGNALS } from "../fixtures";

async function expectHoverableCard(card: HTMLElement) {
  expect(getComputedStyle(card).transitionProperty).not.toBe("none");
  await userEvent.hover(card);
  expect(card).toBeVisible();
}

const meta = {
  title: "4. Data Display/WorthWatchingSection",
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText(/Worth Watching/)).toBeVisible();

    const cards = canvas.getAllByRole("article");
    expect(cards.length).toBeGreaterThan(0);

    const card = cards[0];
    await expectHoverableCard(card);
  },
};

export const TwoItems: Story = {
  args: {
    signals: WORTH_WATCHING_SIGNALS.slice(0, 2),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole("article")).toHaveLength(2);
  },
};

export const SingleItem: Story = {
  args: {
    signals: WORTH_WATCHING_SIGNALS.slice(0, 1),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole("article")).toHaveLength(1);
  },
};
