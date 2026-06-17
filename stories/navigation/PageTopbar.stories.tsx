import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterPills } from "@/components/FilterPills";
import { PageTopbar } from "@/components/PageTopbar";
import { DOMAIN_NAME } from "../fixtures";

const meta = {
  title: "2. Navigation/PageTopbar",
  component: PageTopbar,
  parameters: {
    docs: {
      description: {
        component:
          "Page header with title, domain meta label, subtitle, and optional filter slot. Use at the top of every main content view.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ background: "var(--color-bg-primary)" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: {
      control: "text",
      description: "Primary page heading shown in the topbar",
    },
    subtitle: {
      control: "text",
      description: "Supporting description below the page title",
    },
    meta: {
      control: "text",
      description: "Domain label shown beside the title (e.g. Language Services & Language AI)",
    },
    filters: {
      control: false,
      description: "Optional filter controls rendered below the subtitle",
    },
  },
} satisfies Meta<typeof PageTopbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Market Pulse",
    subtitle:
      "Live signals across Language Services & Language AI — tiered actors, scored updates, and what to watch today.",
    meta: DOMAIN_NAME,
    filters: <FilterPills value="all" onChange={() => undefined} worthWatchingCount={3} />,
  },
};

export const WithoutFilters: Story = {
  args: {
    title: "Actors",
    subtitle:
      "Tracked actor registry — tier, role, geography, and lifecycle status for the Language Services domain.",
    meta: DOMAIN_NAME,
  },
};

export const Timeline: Story = {
  args: {
    title: "Timeline",
    subtitle: "Chronological signal history across all tracked Language Services actors.",
    meta: DOMAIN_NAME,
    filters: <FilterPills value="1" onChange={() => undefined} worthWatchingCount={3} />,
  },
};
