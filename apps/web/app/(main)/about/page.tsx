"use client";

import Card from "@/components/ui/Card";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Tech stack badges
// ---------------------------------------------------------------------------

const TECH_STACK = [
  { name: "Next.js", color: "#E8D9CE" },
  { name: "NestJS", color: "#E0234E" },
  { name: "PostgreSQL", color: "#336791" },
  { name: "Redis", color: "#DC382D" },
  { name: "Claude AI", color: "#CF9D7B" },
  { name: "Socket.IO", color: "#22C55E" },
  { name: "TypeScript", color: "#3178C6" },
  { name: "Turborepo", color: "#EF4444" },
] as const;

// ---------------------------------------------------------------------------
// Team members
// ---------------------------------------------------------------------------

const TEAM = [
  {
    initials: "НК",
    name: "Никита",
    role: "Lead & DevOps",
    description: "Архитектура, инфраструктура, батл-движок, AI-интеграция",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.25)",
  },
  {
    initials: "БД",
    name: "Бонди",
    role: "Frontend & Design",
    description: "UI/UX дизайн, PWA, анимации, мобильный интерфейс",
    color: "#CF9D7B",
    bg: "rgba(207,157,123,0.1)",
    border: "rgba(207,157,123,0.25)",
  },
  {
    initials: "ЯШ",
    name: "Яшкин",
    role: "Backend",
    description: "NestJS API, Prisma, аутентификация, пайплайн контента",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
  },
] as const;

// ---------------------------------------------------------------------------
// Mission bullets
// ---------------------------------------------------------------------------

const MISSION_POINTS = [
  "Интеллектуальные RPG-баттлы 1v1 «Осада крепости» для соревновательного обучения",
  "Дерево знаний с 5 ветками (Стратегия, Логика, Эрудиция, Риторика, Интуиция)",
  "AI-ментор на основе сократического метода — задаёт вопросы, не даёт ответы",
  "Система аватара с прогрессией, достижениями и рейтинговыми баттлами",
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <div className="px-4 pt-12 pb-24 space-y-8">
      {/* ── Hero ───────────────────────────────────────── */}
      <div className="text-center space-y-3 pt-4">
        {/* Logo */}
        <div className="inline-block">
          <h1
            className="text-5xl font-black tracking-wider"
            style={{
              background:
                "linear-gradient(135deg, #CF9D7B 0%, #E8C99A 35%, #B98D34 65%, #CF9D7B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 24px rgba(207,157,123,0.4))",
            }}
          >
            РАЗУМ
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-base text-text-secondary font-medium">
          Платформа интеллектуального развития
        </p>

        {/* Version badge */}
        <span
          className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            background: "rgba(207,157,123,0.1)",
            border: "1px solid rgba(207,157,123,0.2)",
            color: "#CF9D7B",
          }}
        >
          MVP v0.1.0
        </span>
      </div>

      {/* ── Mission ────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
          Миссия
        </h2>
        <Card padding="lg" className="space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            РАЗУМ — это PWA-платформа нового поколения для мужчин, которые хотят
            прокачать интеллект через геймификацию, соревнования и AI-наставничество.
          </p>
          <ul className="space-y-3">
            {MISSION_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                  style={{
                    background: "rgba(207,157,123,0.15)",
                    border: "1px solid rgba(207,157,123,0.25)",
                    color: "#CF9D7B",
                  }}
                >
                  {i + 1}
                </span>
                <p className="text-sm text-text-secondary leading-relaxed">{point}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── Team ───────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
          Команда
        </h2>
        <div className="space-y-3">
          {TEAM.map((member) => (
            <Card key={member.name} padding="md">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    background: member.bg,
                    border: `1px solid ${member.border}`,
                    color: member.color,
                  }}
                >
                  {member.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{member.name}</p>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: member.bg,
                        border: `1px solid ${member.border}`,
                        color: member.color,
                      }}
                    >
                      {member.role}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {member.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Tech Stack ─────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
          Технологии
        </h2>
        <Card padding="lg">
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech.name}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{
                  background: `${tech.color}14`,
                  border: `1px solid ${tech.color}30`,
                  color: tech.color,
                }}
              >
                {tech.name}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Contact ────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-1">
          Контакты
        </h2>
        <Card padding="md" className="space-y-3">
          {/* GitHub */}
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between group hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-text-secondary">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">GitHub</p>
                <p className="text-xs text-text-muted">Исходный код проекта</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-text-muted">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>

          <div className="h-px bg-white/[0.04]" />

          {/* Telegram */}
          <Link
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between group hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(36,161,222,0.1)", border: "1px solid rgba(36,161,222,0.2)" }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: "#24A1DE" }}>
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Telegram</p>
                <p className="text-xs text-text-muted">Сообщество и поддержка</p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-text-muted">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="text-center space-y-1 pb-2">
        <p className="text-xs text-text-muted">
          Сделано с вниманием к деталям командой РАЗУМ
        </p>
        <p className="text-xs text-text-muted opacity-60">
          2026 · MVP v0.1.0
        </p>
      </div>
    </div>
  );
}
