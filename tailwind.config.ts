import type { Config } from "tailwindcss";

/**
 * Design system — ported verbatim from the approved prototypes
 * (buyer flow, advisor onboarding, founder dashboard, documents dashboard).
 * The raw token values live as CSS variables in src/app/globals.css; this
 * config exposes them as Tailwind utilities AND maps the shadcn/ui semantic
 * tokens onto the brand palette, so dropped-in shadcn components are themed
 * automatically in later features. Do not change values without design sign-off.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/presentation/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand palette (the prototypes' raw tokens) ──
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          2: "var(--amber-2)",
          pale: "var(--amber-pale)",
        },
        teal: "var(--teal)",
        rose: "var(--rose)",
        green: "var(--green)",
        violet: "var(--violet)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        soft: "var(--soft)",

        // ── shadcn/ui semantic tokens (mapped to brand) ──
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
      },
      fontFamily: {
        // Loaded via next/font in the root layout; exposed as CSS variables.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "14px",
        lg: "22px",
        xl: "32px",
      },
      boxShadow: {
        sh: "0 4px 32px rgba(10,15,30,0.08)",
        sh2: "0 16px 64px rgba(10,15,30,0.12)",
        sh3: "0 32px 80px rgba(10,15,30,0.18)",
      },
      keyframes: {
        breathe: {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".4", transform: "scale(.8)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 2.5s ease-in-out infinite",
        "fade-up": "fadeUp .35s ease",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
