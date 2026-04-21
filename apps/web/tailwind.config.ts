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
        // Все цвета читаются из CSS-переменных в globals.css.
        // Формат `rgb(var(--token) / <alpha-value>)` позволяет Tailwind
        // применять alpha через суффикс `/XX` (напр. `bg-accent/20`).
        background: "rgb(var(--color-background) / <alpha-value>)",
        "background-subtle": "rgb(var(--color-background-subtle) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-light": "rgb(var(--color-surface-light) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-surface-elevated) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-warm": "rgb(var(--color-accent-warm) / <alpha-value>)",
        "accent-gold": "rgb(var(--color-accent-gold) / <alpha-value>)",
        "accent-red": "rgb(var(--color-accent-red) / <alpha-value>)",
        "accent-orange": "rgb(var(--color-accent-orange) / <alpha-value>)",
        "accent-bronze": "rgb(var(--color-accent-bronze) / <alpha-value>)",
        "accent-silver": "rgb(var(--color-accent-silver) / <alpha-value>)",
        "accent-muted": "rgb(var(--color-accent-muted) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",

        // Семантические статусы
        achievement: "rgb(var(--color-achievement) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",

        // Ветки знаний — F5.5
        "branch-strategy": "rgb(var(--color-branch-strategy) / <alpha-value>)",
        "branch-logic": "rgb(var(--color-branch-logic) / <alpha-value>)",
        "branch-erudition": "rgb(var(--color-branch-erudition) / <alpha-value>)",
        "branch-rhetoric": "rgb(var(--color-branch-rhetoric) / <alpha-value>)",
        "branch-intuition": "rgb(var(--color-branch-intuition) / <alpha-value>)",

        // Холодные акценты — только для ритуальных экранов (определение, барьер) — F20+
        "cold-steel": "rgb(var(--color-cold-steel) / <alpha-value>)",
        "cold-steel-dim": "rgb(var(--color-cold-steel-dim) / <alpha-value>)",
        "cold-blood": "rgb(var(--color-cold-blood) / <alpha-value>)",
      },
      borderRadius: {
        // Дополнительно к Tailwind-дефолтам — для единообразия с токенами.
        // Tailwind xl = 12px, 2xl = 16px совпадают с --radius-md / --radius-lg.
        "token-xs": "var(--radius-xs)",
        "token-sm": "var(--radius-sm)",
        "token-md": "var(--radius-md)",
        "token-lg": "var(--radius-lg)",
      },
      transitionDuration: {
        toast: "var(--duration-toast)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        ritual: ["var(--font-ritual)", "serif"],
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
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.05)" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(24px)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "reveal-from-dark": {
          "0%": { opacity: "0", transform: "translateY(40px) scale(0.98)", filter: "blur(8px) brightness(0.4)" },
          "40%": { opacity: "0.5", filter: "blur(3px) brightness(0.7)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0) brightness(1)" },
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
        "shimmer-flicker":
          "steel-shimmer 4s ease-in-out infinite, text-flicker 3s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "breathe": "breathe 8s ease-in-out infinite",
        "reveal-up": "reveal-up 0.9s cubic-bezier(0.22,1,0.36,1) forwards",
        "reveal-from-dark": "reveal-from-dark 1.4s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
