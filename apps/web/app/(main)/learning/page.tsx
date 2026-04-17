"use client";

/**
 * F21 — Экран «Мой путь».
 * Хаб системы обучения: текущий уровень, день, кнопка «Продолжить»
 * + вертикальная линия пути с 6 уровнями.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import RitualShell from "@/components/learning/RitualShell";
import LevelIcon from "@/components/learning/LevelIcon";
import { LEVELS, getLevelName } from "@/lib/learning/levels";
import {
  getStatus,
  LearningApiError,
  type LearningStatus,
} from "@/lib/api/learning";

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; status: LearningStatus; isDemo: boolean }
  | { phase: "auth-required" }
  | { phase: "error"; message: string };

export default function LearningHubPage() {
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      try {
        const status = await getStatus(accessToken);
        if (!cancelled) setState({ phase: "ready", status, isDemo: false });
      } catch (e) {
        if (cancelled) return;
        const demoStatus: LearningStatus = {
          hasPath: true,
          pathId: "demo",
          currentLevel: "OBSERVER",
          currentLevelName: "Наблюдатель",
          currentDay: 14,
          completedDays: 13,
          totalDays: 42,
        };
        if (e instanceof LearningApiError) {
          if (e.kind === "network" || e.kind === "auth") {
            setState({ phase: "ready", isDemo: true, status: demoStatus });
            return;
          }
          setState({ phase: "error", message: e.message });
          return;
        }
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : "Неизвестная ошибка",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading]);

  // ── LOADING ────────────────────────────────────────────────────────
  if (authLoading || state.phase === "loading") {
    return (
      <RitualShell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-cold-steel animate-pulse">
            Загрузка пути
          </div>
        </div>
      </RitualShell>
    );
  }

  // ── AUTH REQUIRED ──────────────────────────────────────────────────
  if (state.phase === "auth-required") {
    return (
      <RitualShell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-cold-steel mb-6">
            — Требуется вход —
          </div>
          <p className="font-verse italic text-base text-text-secondary mb-8">
            Чтобы увидеть свой путь, нужно войти.
          </p>
          <Link
            href="/login"
            className="inline-block font-ritual text-xs tracking-[0.3em] uppercase text-text-primary border border-cold-steel rounded-xl px-8 py-3 shadow-neon-steel hover:bg-cold-steel hover:text-background transition-all duration-300"
          >
            Войти
          </Link>
        </div>
      </RitualShell>
    );
  }

  // ── SERVER / CLIENT ERROR ──────────────────────────────────────────
  if (state.phase === "error") {
    return (
      <RitualShell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-cold-blood mb-4">
            — Ошибка сервера —
          </div>
          <p className="font-verse italic text-sm text-text-secondary mb-8 opacity-70">
            {state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-ritual text-xs tracking-[0.3em] uppercase text-text-primary border border-cold-steel rounded-xl px-8 py-3 shadow-neon-steel hover:bg-cold-steel hover:text-background transition-all duration-300"
          >
            Повторить
          </button>
        </div>
      </RitualShell>
    );
  }

  const { status, isDemo } = state;

  // ── NO PATH ────────────────────────────────────────────────────────
  if (!status.hasPath) {
    return (
      <RitualShell>
        <div className="max-w-lg mx-auto text-center py-20 sm:py-28 px-6 animate-[slide-up_0.5s_ease-out]">
          <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-steel mb-8">
            — Путь не начат —
          </div>
          <h1 className="font-verse text-3xl sm:text-4xl text-text-primary leading-tight mb-6">
            Твой путь ещё не определён.
          </h1>
          <p className="font-verse italic text-base sm:text-lg text-text-secondary mb-14">
            {status.message ?? "Пройди определение, чтобы начать."}
          </p>
          <Link
            href="/learning/determination"
            className="inline-block font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-10 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)] transition-all duration-300"
          >
            Начать определение
          </Link>
        </div>
      </RitualShell>
    );
  }

  // ── PATH EXISTS ────────────────────────────────────────────────────
  const currentKey = status.currentLevel ?? "SLEEPING";
  const currentIndex = LEVELS.findIndex((l) => l.key === currentKey);
  const currentName = status.currentLevelName ?? getLevelName(currentKey);
  const currentDay = status.currentDay ?? 1;
  const completedDays = status.completedDays ?? 0;
  const totalDays = status.totalDays ?? 0;

  return (
    <RitualShell>
      {isDemo && (
        <div className="relative z-20 max-w-2xl mx-auto mt-6 px-5 sm:px-6">
          <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-center text-text-muted border border-border rounded-lg py-2 px-4 bg-surface/60">
            — Демо · бэкенд не запущен —
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto py-12 sm:py-20 px-5 sm:px-6">
        <div className="text-center mb-14 sm:mb-20 animate-[slide-up_0.5s_ease-out]">
          <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-steel mb-6">
            — Мой путь —
          </div>
          <p className="font-verse italic text-sm sm:text-base text-text-secondary mb-4">
            Твой уровень —
          </p>
          <h1
            className="inline-block font-ritual text-[28px] sm:text-[44px] font-bold tracking-[0.18em] pl-[0.18em] uppercase mb-8 animate-shimmer-flicker"
            style={{
              backgroundImage:
                "linear-gradient(110deg, #8B2E2E 0%, #C0392B 25%, #E8DDD3 50%, #C0392B 75%, #8B2E2E 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
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

          <button
            onClick={() => router.push("/learning/day")}
            className="mt-10 font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-12 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)] transition-all duration-300"
          >
            Продолжить
          </button>
        </div>

        <PathLine currentIndex={currentIndex >= 0 ? currentIndex : 0} />

        {totalDays > 0 && (
          <div className="mt-16 text-center font-ritual text-[10px] tracking-[0.35em] uppercase text-text-muted">
            Пройдено дней · {completedDays} / {totalDays}
          </div>
        )}
      </div>
    </RitualShell>
  );
}

function PathLine({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="relative">
      <div
        aria-hidden
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

              <div className="flex-1 min-w-0">
                <div
                  className={`font-verse italic text-xs sm:text-sm mb-0.5 leading-none ${
                    state === "future" ? "text-text-muted/50" : "text-text-muted"
                  }`}
                >
                  {level.roman}
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
