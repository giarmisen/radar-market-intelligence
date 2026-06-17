import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { colorToHex, getCssVar } from "../helpers/css-tokens";

const COLOR_TOKENS: Array<{ name: string; usage: string; sample?: "text" | "border" | "bg" }> = [
  { name: "--color-sidebar-from", usage: "Sidebar gradient start", sample: "bg" },
  { name: "--color-sidebar-to", usage: "Sidebar gradient end", sample: "bg" },
  { name: "--color-text-primary", usage: "Headings, actor names, primary emphasis", sample: "text" },
  { name: "--color-text-body", usage: "Body copy and signal summaries", sample: "text" },
  { name: "--color-text-muted", usage: "Secondary text, source URLs, inactive labels", sample: "text" },
  { name: "--color-text-dim", usage: "Meta labels, dates, section eyebrows", sample: "text" },
  { name: "--color-bg-content-from", usage: "Main content area gradient start", sample: "bg" },
  { name: "--color-bg-content-to", usage: "Main content area gradient end", sample: "bg" },
  { name: "--color-bg-primary", usage: "Page and card surface background", sample: "bg" },
  { name: "--color-bg-secondary", usage: "Table header and subtle panel background", sample: "bg" },
  { name: "--color-bg-stat-card", usage: "Stat card frosted background", sample: "bg" },
  { name: "--color-card-bg", usage: "Card and panel background", sample: "bg" },
  { name: "--color-card-border", usage: "Card and table container borders", sample: "border" },
  { name: "--color-border-default", usage: "Dividers, signal tier-2 borders, hover states", sample: "border" },
  { name: "--color-border-card", usage: "Form controls and filter input borders", sample: "border" },
  { name: "--color-signal-s3-border", usage: "Critical (score 3) signal left border", sample: "border" },
  { name: "--color-signal-s3-bg", usage: "Critical signal background", sample: "bg" },
  { name: "--color-signal-s2-border", usage: "Standard signal left border", sample: "border" },
  { name: "--color-signal-s2-bg", usage: "Standard signal background tint", sample: "bg" },
  { name: "--color-filter-active-bg", usage: "Active filter pill and primary button background", sample: "bg" },
  { name: "--color-filter-active-text", usage: "Text on active filters and primary buttons", sample: "text" },
  { name: "--color-filter-inactive-bg", usage: "Inactive filter pill background", sample: "bg" },
  { name: "--color-badge-score3-bg", usage: "Relevance score 3 badge background", sample: "bg" },
  { name: "--color-badge-score3-text", usage: "Relevance score 3 badge text", sample: "text" },
  { name: "--color-badge-score2-bg", usage: "Relevance score 2 badge background", sample: "bg" },
  { name: "--color-badge-score2-text", usage: "Relevance score 2 badge text", sample: "text" },
  { name: "--color-new-badge-bg", usage: "NEW signal badge background", sample: "bg" },
  { name: "--color-new-badge-text", usage: "NEW signal badge text", sample: "text" },
  { name: "--color-worth-border", usage: "Worth Watching card border", sample: "border" },
  { name: "--color-upcoming-pill-bg", usage: "Upcoming event pill background", sample: "bg" },
];

/**
 * Live reference for all `--color-*` design tokens.
 * Use when auditing palette changes or documenting token usage for Language Services UI surfaces.
 */
function ColorPalette() {
  return (
    <div style={{ maxWidth: 640, padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
      {COLOR_TOKENS.map((token) => (
        <ColorSwatch key={token.name} {...token} />
      ))}
    </div>
  );
}

function ColorSwatch({ name, usage, sample = "bg" }: (typeof COLOR_TOKENS)[number]) {
  const [value, setValue] = useState("");
  const [hex, setHex] = useState("");

  useEffect(() => {
    const raw = getCssVar(name);
    setValue(raw);
    setHex(colorToHex(raw));
  }, [name]);

  const swatchStyle =
    sample === "text"
      ? { color: `var(${name})`, background: "var(--color-bg-primary)", border: "1px solid var(--color-card-border)" }
      : sample === "border"
        ? { background: "var(--color-bg-primary)", border: `3px solid var(${name})` }
        : { background: `var(${name})`, border: "1px solid var(--color-card-border)" };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--color-border-default)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, ...swatchStyle }} />
      <div>
        <code style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{name}</code>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
          {hex || value || "—"}
          {hex && value && hex !== value ? ` (${value})` : ""}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-dim)", marginTop: 4 }}>{usage}</div>
      </div>
    </div>
  );
}

const meta = {
  title: "Foundation/Colors",
  component: ColorPalette,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Live reference for all `--color-*` design tokens. Use when auditing palette changes or documenting token usage.",
      },
    },
  },
} satisfies Meta<typeof ColorPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllTokens: Story = {
  name: "All Tokens",
};
