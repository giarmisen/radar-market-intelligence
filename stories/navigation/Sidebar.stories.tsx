import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Sidebar } from "@/components/Sidebar";

const meta = {
  title: "2. Navigation/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Primary navigation sidebar for Market Pulse, Timeline, Actors, Reports, and Proposals. Use inside AppShell on every authenticated page.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    active: {
      control: "select",
      options: ["living", "timeline", "reports", "actors", "proposals"],
      description: "Currently highlighted navigation route",
    },
    pendingProposals: {
      control: { type: "number", min: 0 },
      description: "Count shown on the Proposals nav badge",
    },
    collapsed: {
      control: "boolean",
      description: "Whether the sidebar is in collapsed (icon-only) mode",
    },
    isMobile: {
      control: "boolean",
      description: "Mobile layout with overlay drawer behavior",
    },
    onToggleCollapse: { action: "toggleCollapse" },
    onNavigate: { action: "navigate" },
  },
  args: {
    onToggleCollapse: fn(),
    onNavigate: fn(),
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    active: "living",
    pendingProposals: 0,
    collapsed: false,
    isMobile: false,
  },
};

export const WithProposalsBadge: Story = {
  args: {
    active: "living",
    pendingProposals: 4,
    collapsed: false,
    isMobile: false,
  },
};

export const Collapsed: Story = {
  args: {
    active: "timeline",
    pendingProposals: 2,
    collapsed: true,
    isMobile: false,
  },
};

export const TimelineActive: Story = {
  args: {
    active: "timeline",
    pendingProposals: 0,
    collapsed: false,
    isMobile: false,
  },
};
