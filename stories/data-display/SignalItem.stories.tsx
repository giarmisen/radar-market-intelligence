import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { SignalItem } from "@/components/SignalItem";
import {
  languageServicesSignal,
  recentCapture,
  SIGNAL_CATEGORIES,
  signalForCategory,
} from "../fixtures";

const defaultSignal = languageServicesSignal({ relevance: 2, captured_at: null });

const meta = {
  title: "4. Data Display/SignalItem",
  component: SignalItem,
  parameters: {
    docs: {
      description: {
        component:
          "Renders a single intelligence signal with date, category, score, summary, so-what, and source link. Use inside actor cards and worth-watching lists.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 420,
          padding: "var(--spacing-card-padding)",
          background: "var(--color-bg-primary)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  argTypes: {
    signal: { control: "object", description: "Full signal payload" },
  },
  args: {
    signal: defaultSignal,
    variant: "default",
  },
} satisfies Meta<typeof SignalItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const signal = canvas.getByRole("article");
    expect(signal).toHaveClass("radar-signal");

    const sourceLink = canvas.getByRole("link");
    expect(sourceLink).toHaveClass("radar-signal-source");
    await userEvent.hover(sourceLink);
    expect(sourceLink).toBeVisible();

    const soWhat = canvas.getByText(/^→/);
    expect(soWhat).toBeVisible();
    expect(soWhat).toHaveClass("radar-signal-sowhat");
  },
};

export const Score3: Story = {
  args: {
    signal: languageServicesSignal({
      relevance: 3,
      summary:
        "DeepL announced EU sovereign cloud hosting for enterprise MT, targeting regulated buyers that cannot use US-only inference.",
      so_what:
        "Directly challenges RWS and TransPerfect sovereign AI narratives in European public sector RFPs.",
      source_url: "https://slator.com/deepl-eu-sovereign-cloud/",
    }),
  },
};

export const WithNewBadge: Story = {
  args: {
    signal: languageServicesSignal({
      relevance: 3,
      captured_at: recentCapture(),
      summary:
        "Phrase integrated DeepL and ModernMT engines into a single orchestration layer for enterprise buyers.",
      so_what: "Signals TMS vendors consolidating MT vendor relationships for procurement teams.",
      source_url: "https://slator.com/phrase-mt-orchestration/",
      actor_names: ["Phrase (Memsource)"],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const newBadge = canvas.getByText("New");
    expect(newBadge).toBeVisible();
    expect(newBadge).toHaveClass("radar-new-badge");

    const soWhat = canvas.getByText(/^→/);
    expect(soWhat.textContent?.trim().startsWith("→")).toBe(true);
  },
};

export const WithLifecycle: Story = {
  args: {
    signal: languageServicesSignal({
      relevance: 3,
      lifecycle: "acquired",
      summary:
        "Appen completed its acquisition of a specialist speech-and-language data annotation studio in Eastern Europe.",
      so_what:
        "Expands Appen's human-in-the-loop capacity for MT post-editing and RLHF data in European languages.",
      source_url: "https://slator.com/appen-acquisition-language-data/",
      actor_names: ["Appen"],
    }),
  },
};

export const WorthWatchingVariant: Story = {
  args: {
    variant: "worth-watching",
    signal: languageServicesSignal({
      relevance: 3,
      summary:
        "Meta AI expanded NLLB coverage to 12 low-resource languages prioritized by UN agencies and NGO localization programs.",
      so_what:
        "May shift nonprofit and institutional translation spend away from traditional LSP per-word models.",
      source_url: "https://slator.com/meta-nllb-low-resource-expansion/",
      actor_names: ["Meta AI (NLLB)"],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("article");
    expect(card).toHaveClass("radar-worth-watching-card");
    await expectHoverableCard(card);
  },
};

async function expectHoverableCard(card: HTMLElement) {
  expect(getComputedStyle(card).transitionProperty).not.toBe("none");
  await userEvent.hover(card);
  expect(card).toBeVisible();
}

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-stat-gap)" }}>
      {SIGNAL_CATEGORIES.map((category) => (
        <SignalItem key={category} signal={signalForCategory(category)} />
      ))}
    </div>
  ),
};
