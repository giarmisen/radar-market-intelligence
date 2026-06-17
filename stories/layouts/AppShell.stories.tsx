import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "@/components/AppShell";
import { PageTopbar } from "@/components/PageTopbar";
import { DOMAIN_NAME } from "../fixtures";

const meta = {
  title: "Layouts/AppShell",
  component: AppShell,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Application shell with collapsible sidebar and main content column. Wrap every in-app page with AppShell.",
      },
    },
  },
  argTypes: {
    active: {
      control: "select",
      options: ["living", "timeline", "reports", "actors", "proposals"],
      description: "Active sidebar route",
    },
    pendingProposals: {
      control: { type: "number", min: 0 },
      description: "Pending proposals count for the sidebar badge",
    },
    children: {
      control: false,
      description: "Page content rendered in the main column",
    },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "Market Pulse Active",
  args: {
    active: "living",
    pendingProposals: 2,
    children: (
      <>
        <PageTopbar
          title="Market Pulse"
          subtitle="Latest signals per tracked actor — full history in Timeline."
          meta={DOMAIN_NAME}
        />
        <div className="radar-content">
          <p className="text-signal-body">
            App shell with sidebar navigation and main content column for Language Services intelligence.
          </p>
        </div>
      </>
    ),
  },
};

export const TimelineActive: Story = {
  args: {
    active: "timeline",
    pendingProposals: 0,
    children: (
      <>
        <PageTopbar
          title="Timeline"
          subtitle="Chronological signal history across all tracked Language Services actors."
          meta={DOMAIN_NAME}
        />
        <div className="radar-content">
          <p className="text-signal-body">
            Navigate between Market Pulse, Timeline, Actors, and Reports from the sidebar.
          </p>
        </div>
      </>
    ),
  },
};

export const WithProposals: Story = {
  args: {
    active: "proposals",
    pendingProposals: 5,
    children: (
      <>
        <PageTopbar
          title="Proposals"
          subtitle="Review pending actor and signal proposals for the Language Services domain."
          meta={DOMAIN_NAME}
        />
        <div className="radar-content">
          <p className="text-signal-body">Five proposals awaiting analyst review.</p>
        </div>
      </>
    ),
  },
};
