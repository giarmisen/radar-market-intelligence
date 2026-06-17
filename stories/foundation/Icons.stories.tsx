import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  IconActors,
  IconChevronLeft,
  IconChevronRight,
  IconMenu,
  IconProposals,
  IconPulse,
  IconReport,
  IconTimeline,
} from "@/components/SidebarIcons";

const ICONS = [
  { name: "IconPulse", component: IconPulse, usage: "Market Pulse nav" },
  { name: "IconTimeline", component: IconTimeline, usage: "Timeline nav" },
  { name: "IconActors", component: IconActors, usage: "Actors nav" },
  { name: "IconReport", component: IconReport, usage: "Reports nav" },
  { name: "IconProposals", component: IconProposals, usage: "Proposals nav" },
  { name: "IconMenu", component: IconMenu, usage: "Mobile sidebar trigger" },
  { name: "IconChevronLeft", component: IconChevronLeft, usage: "Collapse sidebar" },
  { name: "IconChevronRight", component: IconChevronRight, usage: "Expand sidebar" },
] as const;

/**
 * Reference grid for sidebar and UI icons used across Radar navigation.
 * Use when adding nav items or checking icon sizing on dark sidebar backgrounds.
 */
function IconGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "var(--spacing-stat-gap)",
        padding: "var(--spacing-card-padding)",
        background: "var(--color-bg-primary)",
      }}
    >
      {ICONS.map(({ name, component: Icon, usage }) => (
        <div
          key={name}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: 16,
            border: "1px solid var(--color-card-border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "var(--radius-sidebar-item)",
              background: "var(--color-sidebar-from)",
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            <Icon />
          </div>
          <code style={{ fontSize: 11, color: "var(--color-text-primary)" }}>{name}</code>
          <span style={{ fontSize: 10, color: "var(--color-text-dim)", textAlign: "center" }}>{usage}</span>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "1. Foundation/Icons",
  component: IconGrid,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof IconGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllIcons: Story = {
  name: "All Icons",
};
