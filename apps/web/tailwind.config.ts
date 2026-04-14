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
        background: "#050505",
        "background-subtle": "#0A0A0C",
        surface: "#111114",
        "surface-light": "#1A1A1F",
        "surface-elevated": "#222228",
        accent: "#CF9D7B",
        "accent-warm": "#724B39",
        "accent-gold": "#B98D34",
        "accent-red": "#C0392B",
        "accent-orange": "#E67E22",
        "accent-bronze": "#B4783C",
        "accent-silver": "#C0C0D2",
        "accent-muted": "#56453A",
        "text-primary": "#E8DDD3",
        "text-secondary": "#87756A",
        "text-muted": "#56453A",
        border: "#1E1E22",

        // Ветки знаний — F5.5
        "branch-strategy": "#06B6D4",
        "branch-logic": "#22C55E",
        "branch-erudition": "#A855F7",
        "branch-rhetoric": "#F97316",
        "branch-intuition": "#EC4899",

        // Холодные акценты — только для ритуальных экранов (определение, барьер) — F20+
        "cold-steel": "#6B7D8C",
        "cold-steel-dim": "#3A4550",
        "cold-blood": "#8B2E2E",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        ritual: ["var(--font-cinzel)", "serif"],
        verse: ["var(--font-cormorant)", "serif"],
      },
      backgroundImage: {
        "metallic": "linear-gradient(135deg, #CF9D7B 0%, #B98D34 40%, #CF9D7B 60%, #E8C89E 100%)",
        "metallic-dark": "linear-gradient(135deg, #724B39 0%, #89352A 50%, #724B39 100%)",
        "neon-glow": "radial-gradient(ellipse at center, rgba(207,157,123,0.15) 0%, transparent 70%)",
      },
      boxShadow: {
        "neon-accent": "0 0 20px rgba(207,157,123,0.25), 0 0 60px rgba(207,157,123,0.08)",
        "neon-red": "0 0 20px rgba(192,57,43,0.3), 0 0 60px rgba(192,57,43,0.1)",
        "neon-gold": "0 0 20px rgba(185,141,52,0.3), 0 0 60px rgba(185,141,52,0.1)",
        "neon-strategy": "0 0 20px rgba(6,182,212,0.3), 0 0 60px rgba(6,182,212,0.1)",
        "neon-logic": "0 0 20px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1)",
        "neon-erudition": "0 0 20px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.1)",
        "neon-rhetoric": "0 0 20px rgba(249,115,22,0.3), 0 0 60px rgba(249,115,22,0.1)",
        "neon-intuition": "0 0 20px rgba(236,72,153,0.3), 0 0 60px rgba(236,72,153,0.1)",
        "glass": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "neon-steel": "0 0 20px rgba(107,125,140,0.4), 0 0 50px rgba(107,125,140,0.15)",
        "neon-blood": "0 0 24px rgba(139,46,46,0.55), 0 0 60px rgba(139,46,46,0.2)",
        "neon-steel-inset": "inset 0 0 20px rgba(107,125,140,0.15), 0 0 30px rgba(107,125,140,0.25)",
      },
      keyframes: {
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "pulse-critical": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "float-up": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-60px) scale(1.2)" },
        },
        "particle-burst": {
          "0%": { opacity: "1", transform: "scale(0)" },
          "50%": { opacity: "0.8", transform: "scale(1.5)" },
          "100%": { opacity: "0", transform: "scale(2.5)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(207,157,123,0.2)" },
          "50%": { boxShadow: "0 0 25px rgba(207,157,123,0.5), 0 0 50px rgba(207,157,123,0.15)" },
        },
        "count-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "glow-pulse-badge": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(207,157,123,0.2), 0 0 20px rgba(207,157,123,0.05)" },
          "50%": { boxShadow: "0 0 20px rgba(207,157,123,0.45), 0 0 50px rgba(207,157,123,0.12)" },
        },
        "correct-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(34,197,94,0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "ripple-out": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "40%": { opacity: "1" },
          "100%": { opacity: "0", transform: "scale(2.5)" },
        },
        "blood-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(139,46,46,0.4), 0 0 20px rgba(139,46,46,0.1)", opacity: "0.85" },
          "50%": { boxShadow: "0 0 20px rgba(139,46,46,0.7), 0 0 45px rgba(139,46,46,0.25)", opacity: "1" },
        },
        "steel-shimmer": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "aurora-drift": {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)", opacity: "0.35" },
          "33%": { transform: "translate(10%, -8%) scale(1.1)", opacity: "0.5" },
          "66%": { transform: "translate(-8%, 6%) scale(0.95)", opacity: "0.4" },
        },
        "text-flicker": {
          "0%, 100%": { textShadow: "0 0 12px rgba(139,46,46,0.5), 0 0 28px rgba(139,46,46,0.25)" },
          "50%": { textShadow: "0 0 22px rgba(139,46,46,0.8), 0 0 55px rgba(139,46,46,0.4)" },
        },
      },
      animation: {
        "shake": "shake 0.5s ease-in-out",
        "pulse-critical": "pulse-critical 0.8s ease-in-out infinite",
        "float-up": "float-up 1.2s ease-out forwards",
        "particle-burst": "particle-burst 0.8s ease-out forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-pulse-badge": "glow-pulse-badge 2.5s ease-in-out infinite",
        "count-up": "count-up 0.4s ease-out forwards",
        "correct-glow": "correct-glow 1.5s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "ripple-out": "ripple-out 0.8s ease-out forwards",
        "blood-pulse": "blood-pulse 2.2s ease-in-out infinite",
        "steel-shimmer": "steel-shimmer 4s ease-in-out infinite",
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        "text-flicker": "text-flicker 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
