import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { Sidebar, type SidebarActive } from "@/components/Sidebar";

const SIDEBAR_HREF_TO_ACTIVE: Record<string, SidebarActive> = {
  "/": "living",
  "/timeline": "timeline",
  "/actors": "actors",
  "/reports": "reports",
  "/proposals": "proposals",
};

function InteractiveSidebar(props: ComponentProps<typeof Sidebar>) {
  const [active, setActive] = useState(props.active);

  useEffect(() => {
    setActive(props.active);
  }, [props.active]);

  const handleCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest("a.radar-sidebar-item");
    if (!link) {
      return;
    }

    const href = link.getAttribute("href");
    const nextActive = href ? SIDEBAR_HREF_TO_ACTIVE[href] : undefined;
    if (!nextActive) {
      return;
    }

    event.preventDefault();
    setActive(nextActive);
    props.onNavigate();
  };

  return (
    <div onClickCapture={handleCapture}>
      <Sidebar {...props} active={active} />
    </div>
  );
}

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

async function clickNavItemAndExpectActive(
  canvasElement: HTMLElement,
  name: string | RegExp,
) {
  const canvas = within(canvasElement);
  const link = canvas.getByRole("link", { name });
  await userEvent.click(link);
  expect(link).toHaveClass("radar-sidebar-item-active");
  expect(link).toHaveAttribute("aria-current", "page");
}

export const Default: Story = {
  render: (args) => <InteractiveSidebar {...args} />,
  args: {
    active: "living",
    pendingProposals: 0,
    collapsed: false,
    isMobile: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Radar.")).toBeVisible();
    await clickNavItemAndExpectActive(canvasElement, "Timeline");
    await clickNavItemAndExpectActive(canvasElement, "Actors");
    await clickNavItemAndExpectActive(canvasElement, "Reports");
    await clickNavItemAndExpectActive(canvasElement, "Market Pulse");
  },
};

export const WithProposalsBadge: Story = {
  render: (args) => <InteractiveSidebar {...args} />,
  args: {
    active: "living",
    pendingProposals: 4,
    collapsed: false,
    isMobile: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText("4");
    expect(badge).toBeVisible();
    expect(badge).toHaveClass("radar-sidebar-badge");
    await clickNavItemAndExpectActive(canvasElement, /Proposals/);
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timeline = canvas.getByRole("link", { name: "Timeline" });
    expect(timeline).toHaveClass("radar-sidebar-item-active");
  },
};
