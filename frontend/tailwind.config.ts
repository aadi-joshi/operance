import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#060609",
          secondary: "#0c0d14",
          tertiary: "#13141e",
          card: "#0f1018",
          hover: "#171925",
        },
        border: {
          subtle: "rgba(255,255,255,0.05)",
          default: "rgba(255,255,255,0.09)",
          strong: "rgba(255,255,255,0.15)",
          blue: "rgba(0,82,255,0.35)",
        },
        blue: {
          DEFAULT: "#0052ff",
          light: "#3375ff",
          dim: "rgba(0,82,255,0.15)",
          glow: "rgba(0,82,255,0.25)",
        },
        text: {
          primary: "#ffffff",
          secondary: "#8b8fa8",
          muted: "#4a4e63",
          blue: "#6699ff",
        },
        green: {
          DEFAULT: "#00c896",
          dim: "rgba(0,200,150,0.15)",
        },
        orange: {
          DEFAULT: "#f59e0b",
          dim: "rgba(245,158,11,0.15)",
        },
        red: {
          DEFAULT: "#ef4444",
          dim: "rgba(239,68,68,0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "blue-gradient": "linear-gradient(135deg, rgba(0,82,255,0.15) 0%, transparent 60%)",
        "card-gradient": "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,82,255,0.25), transparent)",
        "grid": "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid": "48px 48px",
      },
      boxShadow: {
        "blue-glow": "0 0 30px rgba(0,82,255,0.2)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,82,255,0.25)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
        "scan": "scan 2s linear infinite",
        "ticker": "ticker 20s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(0,82,255,0.1)" },
          "100%": { boxShadow: "0 0 40px rgba(0,82,255,0.3)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
