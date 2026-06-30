import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { MarketPulsePage } from "@/components/MarketPulsePage";
import { marketPulseData } from "../fixtures";

const meta = {
  title: "5. Layouts/MarketPulse",
  component: MarketPulsePage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full Market Pulse view with stats, upcoming events, tiered actor cards, and worth-watching section. Use as the domain home page.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="radar-main-column" style={{ minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    data: {
      control: "object",
      description: "Living document page data — tiers, stats, upcoming events, and worth-watching signals",
    },
  },
  args: {
    data: marketPulseData(),
  },
} satisfies Meta<typeof MarketPulsePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvasElement.querySelector('[aria-label="Upcoming events"]')).toBeVisible();

    const actorCards = canvasElement.querySelectorAll(".radar-card");
    expect(actorCards.length).toBeGreaterThan(0);

    expect(canvasElement.querySelector("#worth-watching")).toBeVisible();
    expect(
      canvas.getByRole("heading", { name: /Worth Watching: signals from beyond the radar/i }),
    ).toBeVisible();
  },
};

export const NoProposals: Story = {
  args: {
    data: {
      ...marketPulseData(),
      pendingProposals: 0,
    },
  },
};

export const TierOneOnly: Story = {
  name: "Tier 1 Focus",
  render: (args) => <MarketPulsePage {...args} />,
  args: {
    data: {
      ...marketPulseData(),
      tiers: marketPulseData().tiers.filter((tier) => tier.tier === 1),
    },
  },
};
