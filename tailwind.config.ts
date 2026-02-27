import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          light: "#f0d9b5",
          dark: "#b58863",
          highlight: "#cdd16e",
          "highlight-dark": "#aaa23a",
          arrow: "#003088cc",
        },
        brand: {
          DEFAULT: "#7c3aed",
          dark: "#5b21b6",
          light: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "eval-bar": "evalBar 0.4s ease-out",
      },
      keyframes: {
        slideIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        evalBar: {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
