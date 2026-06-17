import type { Meta, StoryObj } from "@storybook/nextjs-vite";
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

export const Default: Story = {};

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
};

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-stat-gap)" }}>
      {SIGNAL_CATEGORIES.map((category) => (
        <SignalItem key={category} signal={signalForCategory(category)} />
      ))}
    </div>
  ),
};
