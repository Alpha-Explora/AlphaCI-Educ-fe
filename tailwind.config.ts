import type { Config } from "tailwindcss";

/** One step of the brand ramp, as an alpha-aware reference to its token. */
const brand = (step: number) => `rgb(var(--brand-${step}) / <alpha-value>)`;

/** The shadow tint at a given opacity. Not alpha-aware: shadows fix their own. */
const tint = (alpha: number) => `rgb(var(--shadow-tint) / ${alpha})`;

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NO COLOUR VALUES LIVE HERE. Every entry below resolves to a CSS
        // variable defined in `src/app/globals.css`, which is the single file
        // a school edits to re-skin the platform. Keeping the hexes in one
        // place is what makes this a template rather than a fork.
        //
        // `<alpha-value>` is Tailwind's placeholder: it is what keeps opacity
        // modifiers working (`border-platform/40`), which a plain
        // `var(--brand-600)` would silently break. It only works because the
        // variables store raw channels ("37 99 235"), not hex.
        //
        // The `platform` name is kept because it is referenced across ~40
        // files; think of it as "the brand scale".
        platform: {
          DEFAULT: brand(600),
          50: brand(50),
          100: brand(100),
          200: brand(200),
          300: brand(300),
          400: brand(400),
          500: brand(500),
          600: brand(600),
          700: brand(700),
          800: brand(800),
          900: brand(900),
        },
        // The teacher's pen. Landing-page annotation only, never UI chrome.
        mark: "rgb(var(--ink-mark) / <alpha-value>)",
        github: {
          DEFAULT: "#24292e", // GitHub dark — deliberately NOT tokenised; this
          soft: "#2f363d", // is GitHub's brand, not the school's, and it must
          border: "#444c56", // stay recognisable after any re-skin.
        },
        // Friendly accents. Used for encouragement and category colour, never
        // as the primary action.
        mint: "var(--accent-mint)",
        sun: "var(--accent-sun)",
        grape: "var(--accent-grape)",
        success: "var(--status-success)",
        warning: "var(--status-warning)",
        danger: "var(--status-danger)",
      },
      borderRadius: {
        card: "var(--radius-card)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        // Brand-tinted shadows rather than neutral black: on a white page a
        // grey shadow reads as smudge, a tinted one reads as depth. The tint
        // is a token too, so it follows the palette on a re-skin.
        card: `0 1px 2px ${tint(0.04)}, 0 1px 3px ${tint(0.08)}`,
        "card-hover": `0 4px 14px ${tint(0.1)}, 0 2px 5px ${tint(0.06)}`,
        lift: `0 10px 30px ${tint(0.1)}, 0 2px 8px ${tint(0.06)}`,
        // Paper lying on paper: the landing card sits ON the ruled sheet, so
        // it needs a deeper, softer shadow than an in-app card.
        sheet: `0 24px 60px ${tint(0.14)}, 0 6px 18px ${tint(0.08)}`,
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
