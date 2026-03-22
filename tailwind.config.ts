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
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          50: "#E8EEF5",
          100: "#C5D4E5",
          200: "#9FB5D3",
          300: "#7996C1",
          400: "#5C7DB3",
          500: "#3F64A5",
          600: "#1A3A6B",
          700: "#152E57",
          800: "#0F2147",
          900: "#0A1630",
        },
        gold: {
          50: "#FCF6E5",
          100: "#F7E8C0",
          200: "#F1D896",
          300: "#EBC86C",
          400: "#E4B52F",
          500: "#D4A017",
          600: "#B88A14",
          700: "#9C7411",
          800: "#805E0E",
          900: "#64480B",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        display: ["var(--font-crimson)", "Georgia", "serif"],
        body: ["var(--font-source-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 12px rgba(26, 58, 107, 0.08)",
        "card-hover": "0 12px 24px rgba(26, 58, 107, 0.15)",
        "input-focus": "0 0 0 3px rgba(26, 58, 107, 0.1)",
      },
      transitionTimingFunction: {
        "ease-out-custom": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
