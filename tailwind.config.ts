import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "var(--color-bg-primary)",
        "bg-secondary": "var(--color-bg-secondary)",
        "border": "var(--color-border-default)",
        "text-primary": "var(--color-text-primary)",
        "text-body": "var(--color-text-body)",
        "text-muted": "var(--color-text-muted)",
        "text-dim": "var(--color-text-dim)",
        "accent-bg": "var(--color-badge-score2-bg)",
        "filter-active": "var(--color-filter-active-bg)",
        "filter-inactive": "var(--color-filter-inactive-bg)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-primary)", "system-ui", "sans-serif"],
        structure: [
          "var(--font-montserrat)",
          "Montserrat",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
