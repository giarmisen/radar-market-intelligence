import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { getCssVar } from "../helpers/css-tokens";

/**
 * Interactive demos for motion tokens used on cards and navigation controls.
 * Use when tuning hover feedback on actor cards, filter pills, and sidebar items.
 */
function MotionShowcase() {
  return (
    <div style={{ padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
      <TransitionCardDemo />
      <TransitionNavDemo />
    </div>
  );
}

function TransitionCardDemo() {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(getCssVar("--transition-card"));
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <code style={{ fontSize: 12, color: "var(--color-text-primary)" }}>--transition-card</code>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "4px 0 12px" }}>{value}</div>
      <p style={{ fontSize: 11, color: "var(--color-text-dim)", marginBottom: 12 }}>
        Used on cards and worth-watching items — hover to see border, shadow, and lift.
      </p>
      <div className="radar-card" style={{ maxWidth: 280, cursor: "default" }}>
        <h3 className="text-actor-name radar-card-name">RWS</h3>
        <p className="text-signal-body" style={{ margin: 0 }}>
          Hover this card to preview the transition token on Language Services actors.
        </p>
      </div>
    </div>
  );
}

function TransitionNavDemo() {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(getCssVar("--transition-nav"));
  }, []);

  return (
    <div>
      <code style={{ fontSize: 12, color: "var(--color-text-primary)" }}>--transition-nav</code>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "4px 0 12px" }}>{value}</div>
      <p style={{ fontSize: 11, color: "var(--color-text-dim)", marginBottom: 12 }}>
        Used on filter pills and sidebar items — hover and click to see color and background shifts.
      </p>
      <div
        style={{
          display: "inline-flex",
          gap: "var(--spacing-stat-gap)",
          padding: 16,
          background: "var(--color-sidebar-from)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <button type="button" className="radar-filter-pill text-nav-item" style={{ cursor: "pointer" }}>
          All tiers
        </button>
        <button type="button" className="radar-filter-pill radar-filter-pill-active" style={{ cursor: "pointer" }}>
          Tier 1
        </button>
        <span className="radar-sidebar-item text-nav-item" style={{ padding: "6px 10px", cursor: "default" }}>
          Timeline
        </span>
        <span
          className="radar-sidebar-item radar-sidebar-item-active text-nav-item text-nav-item-active"
          style={{ padding: "6px 10px", cursor: "default" }}
        >
          Market Pulse
        </span>
      </div>
    </div>
  );
}

const meta = {
  title: "Foundation/Motion",
  component: MotionShowcase,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof MotionShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Transitions: Story = {
  name: "Card and Nav Transitions",
};
