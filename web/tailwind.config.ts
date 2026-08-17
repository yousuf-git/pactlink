import type { Config } from "tailwindcss";

// PactLink design system (FED.md). Light-mode only, v1.
// Palette is token-based so dark mode can be added later without rework.
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4965",
          hover: "#163A52",
        },
        secondary: "#5FA8D3",
        accent: "#F4A259",
        background: "#F7F9FB",
        surface: "#FFFFFF",
        "surface-alt": "#EEF3F7",
        border: "#D7E0E8",
        "text-primary": "#0F2330",
        "text-secondary": "#5A6B78",
        success: "#2E9E6B",
        warning: "#E0A11A",
        error: "#D14545",
        info: "#3E7CB1",
        // editorial monochrome system (public marketing pages — mirrors Hero)
        paper: "#F2F0EB",
        "paper-dim": "#E8E5DE",
        ink: "#16181C",
        "ink-soft": "#565A61",
        "ink-faint": "#9A968E",
        line: "#D9D5CC",
        glow: "#C99A4B",
        danger: "#B23A33",
      },
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        headline: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        grotesk: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "26px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "30px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "40px" }],
        "5xl": ["48px", { lineHeight: "1.05" }],
        "6xl": ["60px", { lineHeight: "1.0" }],
        "7xl": ["76px", { lineHeight: "0.95" }],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        pill: "9999px",
      },
      maxWidth: {
        dashboard: "1280px",
        approval: "720px",
        site: "1480px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,35,48,.06)",
        "card-hover": "0 4px 16px rgba(15,35,48,.10)",
        drawer: "-8px 0 32px rgba(15,35,48,.12)",
        lift: "0 10px 40px rgba(27,73,101,.18)",
      },
      backgroundImage: {
        "trust-header": "linear-gradient(135deg, #1B4965 0%, #2C5F7E 100%)",
        "funnel-fill": "linear-gradient(180deg, #5FA8D3 0%, #2E9E6B 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "flash-secondary": {
          "0%": { color: "#5FA8D3" },
          "100%": { color: "#0F2330" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "settle-check": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "flash-secondary": "flash-secondary 0.6s ease-out",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "settle-check": "settle-check 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
