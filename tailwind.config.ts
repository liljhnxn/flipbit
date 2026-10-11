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
        navy: {
          950: "#060913",
          900: "#0B1120",
          850: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        gold: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        coinblue: {
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
        },
      },
      keyframes: {
        flipspin: {
          "0%": { transform: "rotateY(0deg) scale(1)" },
          "50%": { transform: "rotateY(900deg) scale(1.08)" },
          "100%": { transform: "rotateY(1800deg) scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 25px rgba(245, 158, 11, 0.25)" },
          "50%": { boxShadow: "0 0 45px rgba(59, 130, 246, 0.35)" },
        },
      },
      animation: {
        flipspin: "flipspin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        glow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
