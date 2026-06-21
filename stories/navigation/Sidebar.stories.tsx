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
  const [collapsed, setCollapsed] = useState(props.collapsed);

  useEffect(() => {
    setActive(props.active);
  }, [props.active]);

  useEffect(() => {
    setCollapsed(props.collapsed);
  }, [props.collapsed]);

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
      <Sidebar
        {...props}
        active={active}
        collapsed={collapsed}
        onToggleCollapse={() => {
          setCollapsed((previous) => !previous);
          props.onToggleCollapse();
        }}
      />
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

export const WithDomainBlock: Story = {
  render: (args) => <InteractiveSidebar {...args} />,
  args: {
    active: "living",
    pendingProposals: 0,
    collapsed: false,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shows the domain block at the bottom of the sidebar with the configured domain name and example domain label. The domain name never appears in page headers — sidebar only.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Example domain")).toBeVisible();
    expect(canvas.getByText("Language Services & Language AI")).toBeVisible();
  },
};

export const CollapseButton: Story = {
  render: (args) => <InteractiveSidebar {...args} />,
  args: {
    active: "living",
    pendingProposals: 0,
    collapsed: false,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "The collapse toggle shows a left chevron and the text Collapse when expanded. When collapsed, only the right chevron is shown.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: /collapse/i });
    expect(toggle).toBeVisible();
    await userEvent.click(toggle);
    expect(canvas.queryByText("Collapse")).not.toBeInTheDocument();
  },
};

export const CollapsedToggleVisible: Story = {
  args: {
    active: "living",
    pendingProposals: 0,
    collapsed: true,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When collapsed, the toggle button remains visible showing only a right-pointing chevron. This is the only affordance to expand the sidebar again.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: /expand/i });
    expect(toggle).toBeVisible();
  },
};

export const TabletCollapsed: Story = {
  args: {
    active: "living",
    pendingProposals: 2,
    collapsed: true,
    isMobile: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "On tablet (768px to 1024px) the sidebar is automatically collapsed to icon-only mode. Domain block and labels are hidden. Toggle remains visible.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByText("Language Services & Language AI")).not.toBeInTheDocument();
    expect(canvas.queryByText("Collapse")).not.toBeInTheDocument();
  },
};
