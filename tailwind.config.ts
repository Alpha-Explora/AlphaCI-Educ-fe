import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Plan palette
        platform: {
          DEFAULT: "#0e76a8", // platform blue
          50: "#eef7fb",
          100: "#d3ebf4",
          600: "#0e76a8",
          700: "#0b5e87",
          800: "#094d6f",
        },
        github: {
          DEFAULT: "#24292e", // GitHub dark
          soft: "#2f363d",
          border: "#444c56",
        },
        success: "#28a745",
        warning: "#f0ad4e",
        danger: "#d64545",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.08)",
        "card-hover": "0 4px 12px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
