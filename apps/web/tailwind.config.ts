import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#141414",
        "surface-light": "#1e1e1e",
        "accent-red": "#ef4444",
        "accent-blue": "#3b82f6",
        "accent-green": "#22c55e",
        "accent-gold": "#eab308",
        "accent-purple": "#a855f7",
        "accent-silver": "#94a3b8",
      },
    },
  },
  plugins: [],
};

export default config;
