import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: "#060709",
          900: "#09090b",
          850: "#0d0e12",
          800: "#12131a",
          700: "#181a24",
          600: "#222533",
        },
        cyber: {
          emerald: "#10b981",
          rose: "#ef4444",
          indigo: "#6366f1",
          violet: "#8b5cf6",
          amber: "#f59e0b",
          cyan: "#06b6d4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-emerald": "0 0 20px -3px rgba(16, 185, 129, 0.35)",
        "glow-rose": "0 0 20px -3px rgba(239, 68, 68, 0.45)",
        "glow-indigo": "0 0 20px -3px rgba(99, 102, 241, 0.4)",
        "cyber-card": "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "striped-warning":
          "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.15) 10px, rgba(239, 68, 68, 0.03) 10px, rgba(239, 68, 68, 0.03) 20px)",
        "striped-emerald":
          "repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.15) 10px, rgba(16, 185, 129, 0.04) 10px, rgba(16, 185, 129, 0.04) 20px)",
      },
      animation: {
        "pulse-subtle": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "border-glow": "borderGlow 2s ease-in-out infinite",
      },
      keyframes: {
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(239, 68, 68, 0.8)" },
          "50%": { borderColor: "rgba(239, 68, 68, 0.3)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
