import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { getCssVar } from "../helpers/css-tokens";

const TEXT_CLASSES: Array<{ className: string; sample: string; context: string }> = [
  { className: "text-page-title", sample: "Market Pulse", context: "Page topbar title" },
  { className: "text-section-label", sample: "Tier 1 — Enterprise LSPs", context: "Section eyebrows and table group labels" },
  { className: "text-actor-name", sample: "TransPerfect", context: "Actor card and registry names" },
  { className: "text-actor-meta", sample: "Processor · Tier 1 · US, EU", context: "Actor role, tier, and geography" },
  { className: "text-signal-body", sample: "Phrase shipped in-context AI quality estimation across Memsource projects.", context: "Signal summary text" },
  { className: "text-signal-sowhat", sample: "→ Pushes TMS vendors deeper into MTQA pricing conversations.", context: "Signal so-what line" },
  { className: "text-date", sample: "Mar 12, 2026", context: "Signal and timeline dates" },
  { className: "text-source-url", sample: "slator.com/phrase-ai-quality-estimation", context: "Linked source attribution" },
  { className: "text-stat-number", sample: "47", context: "Stat grid values" },
  { className: "text-stat-label", sample: "Signals this week", context: "Stat grid labels" },
  { className: "text-nav-item", sample: "Market Pulse", context: "Sidebar navigation (default)" },
  { className: "text-nav-item text-nav-item-active", sample: "Market Pulse", context: "Sidebar navigation (active)" },
];

/**
 * Live reference for all `.text-*` typography utility classes.
 * Use when choosing type styles for Market Pulse, Timeline, and actor surfaces.
 */
function TypographyScale() {
  return (
    <div style={{ maxWidth: 560, padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
      <div aria-hidden="true" style={{ marginBottom: 16, fontSize: 11, color: "var(--color-text-dim)" }}>
        Primary font: {getCssVar("--font-primary") || "Inter, sans-serif"}
      </div>
      {TEXT_CLASSES.map((item) => (
        <TypographyRow key={item.className} {...item} />
      ))}
    </div>
  );
}

function TypographyRow({ className, sample, context }: (typeof TEXT_CLASSES)[number]) {
  const [metrics, setMetrics] = useState({ fontSize: "", fontWeight: "", color: "" });

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement("span");
    probe.className = className;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.textContent = sample;
    document.body.appendChild(probe);
    const styles = getComputedStyle(probe);
    setMetrics({
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      color: styles.color,
    });
    document.body.removeChild(probe);

    void root;
  }, [className, sample]);

  const onDark = className.includes("text-nav-item");

  return (
    <div
      style={{
        padding: "16px 0",
        borderBottom: "1px solid var(--color-border-default)",
      }}
    >
      <code aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-dim)" }}>
        .{className}
      </code>
      <div
        style={
          onDark
            ? {
                background: getCssVar("--color-sidebar-from") || "var(--color-sidebar-from)",
                padding: "8px 16px",
                borderRadius: 8,
                margin: "8px 0 6px",
              }
            : { margin: "8px 0 6px" }
        }
      >
        <p className={className} style={{ margin: 0 }}>
          {sample}
        </p>
      </div>
      <div aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
        {metrics.fontSize} · weight {metrics.fontWeight} · {metrics.color}
      </div>
      <div aria-hidden="true" style={{ fontSize: 11, color: "var(--color-text-dim)", marginTop: 4 }}>
        {context}
      </div>
    </div>
  );
}

const meta = {
  title: "Foundation/Typography",
  component: TypographyScale,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof TypographyScale>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStyles: Story = {
  name: "All Styles",
};
