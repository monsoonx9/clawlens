import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        amoled: "var(--color-bg)",
        "amoled-soft": "var(--color-bg-soft)",
        card: "var(--color-card)",
        "card-hover": "var(--color-card-hover)",
        "card-border": "var(--color-card-border)",
        "card-border-hover": "var(--color-card-border-hover)",
        glass: "var(--color-glass)",
        "glass-strong": "var(--color-glass-strong)",
        "glass-border": "var(--color-card-border)",
        "glass-border-hover": "var(--color-card-border-hover)",
        "text-primary": "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        "text-dim": "var(--color-text-dim)",
        accent: "var(--color-accent)", // Dynamic - Green
        "accent-dim": "var(--color-accent-dim)",
        "accent-bg": "var(--color-accent-bg)",
        "accent-secondary": "var(--color-accent-secondary)", // Dynamic - Gray
        "accent-secondary-dim": "var(--color-accent-secondary-dim)",
        "accent-secondary-bg": "var(--color-accent-secondary-bg)",
        "agent-scout": "var(--color-agent-scout)",
        "agent-warden": "var(--color-agent-warden)",
        "agent-lens": "var(--color-agent-lens)",
        "agent-shadow": "var(--color-agent-shadow)",
        "agent-ledger": "var(--color-agent-ledger)",
        "agent-pulse": "var(--color-agent-pulse)",
        "agent-sage": "var(--color-agent-sage)",
        "agent-quill": "var(--color-agent-quill)",
        arbiter: "var(--color-accent)", // Green - matches accent
        "risk-low": "var(--color-risk-low)",
        "risk-moderate": "var(--color-risk-moderate)",
        "risk-high": "var(--color-risk-high)",
        "risk-extreme": "var(--color-risk-extreme)",
        neon: {
          50: "color-mix(in srgb, var(--color-accent), white 95%)",
          100: "color-mix(in srgb, var(--color-accent), white 90%)",
          200: "color-mix(in srgb, var(--color-accent), white 80%)",
          300: "color-mix(in srgb, var(--color-accent), white 60%)",
          400: "color-mix(in srgb, var(--color-accent), white 40%)",
          450: "color-mix(in srgb, var(--color-accent), white 20%)",
          500: "var(--color-accent)", // Manjyeel Green - Vibrant Neon
          550: "color-mix(in srgb, var(--color-accent), black 10%)",
          600: "color-mix(in srgb, var(--color-accent), black 20%)",
          700: "color-mix(in srgb, var(--color-accent), black 40%)",
          800: "color-mix(in srgb, var(--color-accent), black 60%)",
          900: "color-mix(in srgb, var(--color-accent), black 80%)",
          950: "color-mix(in srgb, var(--color-accent), black 90%)",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        card: "20px",
        button: "12px",
        pill: "9999px",
      },
      backdropBlur: {
        glass: "12px",
        "glass-strong": "16px",
        "glass-max": "24px",
      },
      boxShadow: {
        glow: "0 0 20px var(--color-glow)",
        "glow-accent": "0 0 20px var(--color-glow-accent)",
        "glow-accent-secondary": "0 0 20px var(--color-glow-accent-secondary)",
        "glow-lg": "0 8px 32px var(--color-glow)",
      },
      animation: {
        "pulse-subtle": "subtle-pulse 2s ease-in-out infinite",
        "fade-up": "fadeUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "slide-in": "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        thinking: "thinking 1.4s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "scale-in": "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        ripple: "ripple 0.6s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        thinking: {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.5" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "subtle-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        ripple: {
          "0%": { width: "0", height: "0", opacity: "0.5" },
          "100%": { width: "200px", height: "200px", opacity: "0" },
        },
      },
      transitionTimingFunction: {
        "out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("@tailwindcss/typography")],
};
export default config;
