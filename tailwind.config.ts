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
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-accent-light": "var(--bg-accent-light)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-body": "var(--text-body)",
        "text-muted": "var(--text-muted)",
        "accent-dark": "var(--accent-dark)",
        "accent-main": "var(--accent-main)",
        "accent-light": "var(--accent-light)",
        "accent-bg": "var(--accent-bg)",
        "accent-border": "var(--accent-border)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
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
