import type { Meta, StoryObj } from "@storybook/nextjs-vite";

/**
 * Inline relevance score badge used on signals, timeline rows, and worth-watching cards.
 * Use score 2 for standard signals and score 3 for critical intelligence updates.
 */
function ScoreBadge({ score }: { score: 2 | 3 }) {
  return <span className={`radar-score-badge radar-score-${score}`}>{score}</span>;
}

const meta = {
  title: "3. Controls/ScoreBadge",
  component: ScoreBadge,
  parameters: {
    docs: {
      description: {
        component:
          "Inline relevance score badge used on signals, timeline rows, and worth-watching cards. Score 2 for relevant, 3 for critical.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "var(--spacing-card-padding)", background: "var(--color-bg-primary)" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    score: {
      control: "select",
      options: [2, 3],
      description: "Relevance score — 2 for relevant, 3 for critical",
    },
  },
  args: {
    score: 2,
  },
} satisfies Meta<typeof ScoreBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Score3: Story = {
  args: { score: 3 },
};
