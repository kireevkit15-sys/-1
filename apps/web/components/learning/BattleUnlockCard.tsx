"use client";

/**
 * F27.2 — Карточка «В бой» после прохождения барьера.
 * Показывается когда игрок прошёл уровень: «Открыто N вопросов для батлов».
 * Ритуальный холодный стиль + неоновая кнопка CTA.
 */

import Link from "next/link";

interface BattleUnlockCardProps {
  levelName: string; // "Наблюдатель", "Воин", ...
  questionsUnlocked: number;
  className?: string;
}

export default function BattleUnlockCard({
  levelName,
  questionsUnlocked,
  className = "",
}: BattleUnlockCardProps) {
  return (
    <div
      className={`glass-card p-6 sm:p-8 text-center relative overflow-hidden border-cold-blood/25 shadow-neon-blood ${className}`}
    >
      {/* фоновое свечение по центру */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at center, rgba(139,46,46,0.2) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10">
        <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-blood mb-3 animate-blood-pulse inline-block">
          — Уровень пройден —
        </div>

        <p className="font-verse italic text-sm sm:text-base text-text-secondary mb-2">
          {levelName}
        </p>

        <p className="font-verse text-lg sm:text-xl text-text-primary mb-5 leading-snug">
          Открыто{" "}
          <span className="text-cold-blood font-medium">
            {questionsUnlocked}
          </span>{" "}
          {pluralize(questionsUnlocked, "вопрос", "вопроса", "вопросов")}
          <br />
          <span className="text-text-secondary">для батлов.</span>
        </p>

        <Link
          href="/battle/new"
          className="inline-block font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-blood rounded-xl px-10 py-3.5 shadow-neon-blood hover:bg-cold-blood hover:text-text-primary hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(139,46,46,0.9),0_0_80px_rgba(139,46,46,0.3)] transition-all duration-300"
        >
          В бой
        </Link>
      </div>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
