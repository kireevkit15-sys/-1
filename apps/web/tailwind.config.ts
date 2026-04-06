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
        background: "#0C1519",
        surface: "#162127",
        "surface-light": "#3A3534",
        accent: "#CF9D7B",
        "accent-warm": "#724B39",
        "accent-gold": "#B98D34",
        "accent-red": "#89352A",
        "accent-muted": "#56453A",
        "text-primary": "#E8DDD3",
        "text-secondary": "#87756A",
        "text-muted": "#56453A",
        border: "#282321",
      },
    },
  },
  plugins: [],
};

export default config;
