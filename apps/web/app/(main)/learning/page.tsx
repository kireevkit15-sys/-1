"use client";

/**
 * F21 — Экран «Мой путь»
 * Минималистичный хаб системы обучения: текущий уровень, текущий день,
 * одна кнопка «Продолжить» + вертикальная линия пути с 6 уровнями.
 * Использует ритуальную типографику (Cinzel/Cormorant) и холодные акценты.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type LevelKey =
  | "SLEEPING"
  | "AWAKENING"
  | "OBSERVER"
  | "WARRIOR"
  | "STRATEGIST"
  | "MASTER";

interface LearningStatus {
  hasPath: boolean;
  pathId?: string;
  currentLevel?: LevelKey;
  currentLevelName?: string;
  currentDay?: number;
  completedDays?: number;
  totalDays?: number;
  message?: string;
}

const LEVELS: Array<{ key: LevelKey; name: string; index: number }> = [
  { key: "SLEEPING", name: "Спящий", index: 1 },
  { key: "AWAKENING", name: "Пробуждённый", index: 2 },
  { key: "OBSERVER", name: "Наблюдатель", index: 3 },
  { key: "WARRIOR", name: "Воин", index: 4 },
  { key: "STRATEGIST", name: "Стратег", index: 5 },
  { key: "MASTER", name: "Мастер", index: 6 },
];

// Римские цифры для подписей
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

// ── Иконки уровней — единый геометрический стиль ─────────────────────
// Концепция: от тёмного спящего круга через пробуждение к полной мандале.
// Все на круге 10px радиуса, stroke 1.25, чтобы смотрелись как серия.
function LevelIcon({ level, className = "" }: { level: LevelKey; className?: string }) {
  const props = {
    className,
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (level) {
    case "SLEEPING":
      // замкнутый круг — мир в себе, непробуждённый
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" opacity="0.6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case "AWAKENING":
      // круг с разрывом сверху — первый свет
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 9-9" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "OBSERVER":
      // круг с линиями-лучами — внимание
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "WARRIOR":
      // круг, рассечённый вертикалью — воля, клинок
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 2v20" strokeWidth="1.8" />
        </svg>
      );
    case "STRATEGIST":
      // круг с треугольником внутри — разум над хаосом
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 5 L19 18 L5 18 Z" />
        </svg>
      );
    case "MASTER":
      // мандала — круг, два треугольника, звезда Давида
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3 L20 17 L4 17 Z" />
          <path d="M12 21 L4 7 L20 7 Z" />
        </svg>
      );
  }
}

export default function LearningHubPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<LearningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/learning/status`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as LearningStatus;
        if (!cancelled) setStatus(data);
      } catch {
        // API недоступен — демо-режим: показываем пример UI
        if (!cancelled) {
          setIsDemo(true);
          setStatus({
            hasPath: true,
            pathId: "demo",
            currentLevel: "OBSERVER",
            currentLevelName: "Наблюдатель",
            currentDay: 14,
            completedDays: 13,
            totalDays: 42,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading]);

  // ── LOADING ────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-cold-steel animate-pulse">
            Загрузка пути
          </div>
        </div>
      </Shell>
    );
  }

  // ── NO PATH — нужно пройти определение ─────────────────────────────
  if (!status?.hasPath) {
    return (
      <Shell>
        <div className="max-w-lg mx-auto text-center py-20 sm:py-28 px-6 animate-[slide-up_0.5s_ease-out]">
          <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-steel mb-8">
            — Путь не начат —
          </div>
          <h1 className="font-verse text-3xl sm:text-4xl text-text-primary leading-tight mb-6">
            Твой путь ещё не определён.
          </h1>
          <p className="font-verse italic text-base sm:text-lg text-text-secondary mb-14">
            {status?.message ?? "Пройди определение, чтобы начать."}
          </p>
          <Link
            href="/learning/determination"
            className="inline-block font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-10 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)] transition-all duration-300"
          >
            Начать определение
          </Link>
        </div>
      </Shell>
    );
  }

  // ── PATH EXISTS ────────────────────────────────────────────────────
  const currentLevelKey = (status.currentLevel ?? "SLEEPING") as LevelKey;
  const currentIndex = LEVELS.findIndex((l) => l.key === currentLevelKey);
  const currentName =
    status.currentLevelName ??
    LEVELS[currentIndex]?.name ??
    "Спящий";
  const currentDay = status.currentDay ?? 1;
  const completedDays = status.completedDays ?? 0;
  const totalDays = status.totalDays ?? 0;

  return (
    <Shell>
      {isDemo && (
        <div className="relative z-20 max-w-2xl mx-auto mt-6 px-5 sm:px-6">
          <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-center text-text-muted border border-border rounded-lg py-2 px-4 bg-surface/60">
            — Демо · бэкенд не запущен —
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto py-12 sm:py-20 px-5 sm:px-6">
        {/* Заголовок — текущий уровень */}
        <div className="text-center mb-14 sm:mb-20 animate-[slide-up_0.5s_ease-out]">
          <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-steel mb-6">
            — Мой путь —
          </div>
          <p className="font-verse italic text-sm sm:text-base text-text-secondary mb-4">
            Твой уровень —
          </p>
          <h1
            className="inline-block font-ritual text-[28px] sm:text-[44px] font-semibold tracking-[0.18em] pl-[0.18em] uppercase mb-8 animate-text-flicker"
            style={{
              backgroundImage:
                "linear-gradient(110deg, #8B2E2E 0%, #C0392B 25%, #E8DDD3 50%, #C0392B 75%, #8B2E2E 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation:
                "steel-shimmer 4s ease-in-out infinite, text-flicker 3s ease-in-out infinite",
            }}
          >
            {currentName}
          </h1>
          <p className="font-verse text-lg sm:text-xl text-text-primary mb-2">
            День <span className="text-cold-blood font-medium">{currentDay}</span>
            {totalDays > 0 && (
              <span className="text-text-muted"> из {totalDays}</span>
            )}
          </p>

          {/* Одна кнопка — «Продолжить» */}
          <button
            onClick={() => router.push("/learning/day")}
            className="mt-10 font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-12 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)] transition-all duration-300"
          >
            Продолжить
          </button>
        </div>

        {/* Вертикальная линия пути */}
        <PathLine currentIndex={currentIndex >= 0 ? currentIndex : 0} />

        {/* Мелкая статистика снизу */}
        {totalDays > 0 && (
          <div className="mt-16 text-center font-ritual text-[10px] tracking-[0.35em] uppercase text-text-muted">
            Пройдено дней · {completedDays} / {totalDays}
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── Вертикальная линия пути ──────────────────────────────────────────
function PathLine({ currentIndex }: { currentIndex: number }) {
  // размер узла: 44 mobile / 52 desktop; центр линии = половина размера
  return (
    <div className="relative">
      {/* вертикальная линия — идёт через центр иконок */}
      <div
        className="absolute top-6 bottom-6 w-px left-[22px] sm:left-[26px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(107,125,140,0.45) 0%, rgba(107,125,140,0.15) 60%, rgba(30,30,34,0.5) 100%)",
        }}
      />

      <ol className="space-y-6 sm:space-y-8 relative">
        {LEVELS.map((level, i) => {
          const state: "passed" | "current" | "future" =
            i < currentIndex ? "passed" : i === currentIndex ? "current" : "future";

          return (
            <li key={level.key} className="flex items-center gap-5 sm:gap-7">
              {/* Узел — круг с иконкой */}
              <div
                className={`relative z-10 shrink-0 w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center border transition-all duration-500 ${
                  state === "passed"
                    ? "bg-surface border-cold-steel/70 text-cold-steel shadow-neon-steel"
                    : state === "current"
                      ? "bg-surface-light border-cold-blood text-cold-blood animate-blood-pulse"
                      : "bg-surface border-border text-text-muted/60"
                }`}
              >
                <LevelIcon level={level.key} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              {/* Текст — римская цифра + название */}
              <div className="flex-1 min-w-0">
                <div
                  className={`font-verse italic text-xs sm:text-sm mb-0.5 leading-none ${
                    state === "future" ? "text-text-muted/50" : "text-text-muted"
                  }`}
                >
                  {ROMAN[i]}
                </div>
                <div
                  className={`font-ritual text-sm sm:text-base tracking-[0.18em] uppercase transition-colors duration-300 ${
                    state === "passed"
                      ? "text-cold-steel"
                      : state === "current"
                        ? "text-cold-blood"
                        : "text-text-muted/50"
                  }`}
                >
                  {level.name}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Оболочка с aurora-фоном ──────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="pointer-events-none fixed -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-[120px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(107,125,140,0.32) 0%, rgba(107,125,140,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed -bottom-40 -right-32 w-[560px] h-[560px] rounded-full blur-[140px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(139,46,46,0.22) 0%, rgba(139,46,46,0) 70%)",
          animationDelay: "-9s",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
