import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { getCssVar } from "../helpers/css-tokens";

const SPACING_TOKENS = [
  { name: "--spacing-card-padding", usage: "Card, profile section, and proposal panel padding" },
  { name: "--spacing-section-gap", usage: "Vertical gap between stat grids, filters, and sections" },
  { name: "--spacing-stat-gap", usage: "Gap inside stat grids, signal lists, and filter rows" },
  { name: "--spacing-signal-padding", usage: "Padding inside signal item blocks" },
] as const;

/**
 * Live reference for all `--spacing-*` design tokens.
 * Use when checking layout rhythm across cards, sections, and signal lists.
 */
function SpacingScale() {
  return (
    <div style={{ padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
      {SPACING_TOKENS.map((token) => (
        <SpacingBlock key={token.name} {...token} />
      ))}
    </div>
  );
}

function SpacingBlock({ name, usage }: (typeof SPACING_TOKENS)[number]) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(getCssVar(name));
  }, [name]);

  return (
    <div style={{ marginBottom: 24 }}>
      <code style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{name}</code>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{value || "—"}</div>
      <div style={{ fontSize: 11, color: "var(--color-text-dim)", marginBottom: 8 }}>{usage}</div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: getCssVar("--color-filter-inactive-bg") || "var(--color-filter-inactive-bg)",
          border: "1px dashed var(--color-border-default)",
          borderRadius: getCssVar("--radius-card") || "var(--radius-card)",
        }}
      >
        <div
          style={{
            padding: `var(${name})`,
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-signal-s3-border)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--color-text-muted)",
          }}
        >
          Content area
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Foundation/Spacing",
  component: SpacingScale,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof SpacingScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllTokens: Story = {
  name: "All Tokens",
};
