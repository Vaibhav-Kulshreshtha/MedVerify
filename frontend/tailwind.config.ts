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
        clinical: {
          navy: "#0F2A3F",
          "navy-light": "#1B3B54",
          "navy-dark": "#091B29",
          bg: "#FAF7F2",
          surface: "#FFFFFF",
          panel: "#F3EEE7",
          border: "#E2DDD5",
          "border-dark": "#C8C0B5",
          muted: "#667688",
          text: "#0F2A3F",
          subtext: "#4F5F71",
        },
        pharm: {
          green: "#2D6A4F",
          "green-bg": "#EDF6F1",
          "green-border": "#96C2AD",
          "green-dark": "#1B4332",
        },
        alert: {
          red: "#C1272D",
          "red-bg": "#FDF2F2",
          "red-border": "#EAA4A7",
          "red-dark": "#8C1B20",
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Lora", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(15, 42, 63, 0.05)",
        specimen: "0 0 0 1px #E2DDD5, 0 1px 3px rgba(15, 42, 63, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
