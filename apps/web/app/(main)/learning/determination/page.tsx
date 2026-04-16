"use client";

/**
 * F20 — Экран определения пути.
 * Холодный пролог: 5 ситуаций → система определяет стартовый уровень.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import RitualShell from "@/components/learning/RitualShell";
import { getLevelName } from "@/lib/learning/levels";
import {
  determine,
  startLearning,
  LearningApiError,
  type DetermineAnswer,
  type DetermineResult,
} from "@/lib/api/learning";
import situations from "@/lib/learning/determination-situations.json";

type Phase = "intro" | "situations" | "submitting" | "result" | "error";

// Цитаты для экрана ошибки — в духе авторов нашей базы.
// TODO (контент): вынести в content/processed/failure-quotes.json
// чтобы Никита мог редактировать без пересборки.
const FAILURE_QUOTES: Array<{ text: string; author: string }> = [
  {
    text: "Кто хочет увидеть свет, должен сначала научиться выдерживать темноту.",
    author: "Ф. Ницше",
  },
  {
    text: "Каждое поражение — урок. Если ты его не извлёк, поражение не закончилось.",
    author: "Н. Макиавелли",
  },
  {
    text: "Самое трудное — не дойти до цели. Самое трудное — начать снова после того, как не дошёл.",
    author: "Г. Гессе",
  },
  {
    text: "Только тот, кто готов снова испытать себя, имеет право называть себя живым.",
    author: "А. Шопенгауэр",
  },
  {
    text: "Сбой системы — не конец. Это приглашение проверить свою собственную.",
    author: "РАЗУМ",
  },
  {
    text: "Великое редко даётся с первого раза. Но никогда не даётся тем, кто не попробовал второй.",
    author: "Ф. Ницше",
  },
];

function pickFailureQuote() {
  const index = Math.floor(Math.random() * FAILURE_QUOTES.length);
  return FAILURE_QUOTES[index] ?? FAILURE_QUOTES[0]!;
}

export default function DeterminationPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<DetermineAnswer[]>([]);
  const [result, setResult] = useState<DetermineResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [errorQuote, setErrorQuote] = useState<typeof FAILURE_QUOTES[0] | null>(null);

  const situation = situations[current];
  const total = situations.length;

  // Guard: не пытаемся рендерить фазу situations без ситуации.
  if (phase === "situations" && !situation) {
    return (
      <RitualShell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <p className="font-verse italic text-text-secondary">
            Что-то пошло не так. Попробуй ещё раз.
          </p>
        </div>
      </RitualShell>
    );
  }

  function handleStart() {
    setPhase("situations");
  }

  function handleChoose(optionIndex: number) {
    if (exiting || !situation) return;

    const next: DetermineAnswer = {
      situationIndex: situation.index,
      chosenOption: optionIndex,
    };
    const allAnswers = [...answers, next];
    setAnswers(allAnswers);

    setExiting(true);

    setTimeout(() => {
      if (current + 1 < total) {
        setCurrent(current + 1);
        setExiting(false);
      } else {
        void submit(allAnswers);
      }
    }, 400);
  }

  async function submit(finalAnswers: DetermineAnswer[]) {
    setPhase("submitting");
    try {
      const data = await determine(finalAnswers, accessToken);
      setResult(data);

      // Create learning path based on determination results
      if (data.startZone && data.painPoint && data.deliveryStyle) {
        try {
          await startLearning(
            {
              startZone: data.startZone,
              painPoint: data.painPoint,
              deliveryStyle: data.deliveryStyle,
            },
            accessToken,
          );
        } catch {
          // Path creation may fail if no concepts are seeded — continue to result screen
        }
      }

      setPhase("result");
    } catch (e) {
      if (e instanceof LearningApiError) {
        // Бэкенд недоступен — демо-режим: просто показываем финал «Спящий»
        if (e.kind === "network") {
          setResult({ level: "SLEEPING" });
          setPhase("result");
          return;
        }
        setErrorMessage(describeError(e));
      } else {
        setErrorMessage(e instanceof Error ? e.message : "Не удалось отправить ответы");
      }
      setErrorQuote(pickFailureQuote());
      setPhase("error");
    }
  }

  function handleEnter() {
    router.push("/learning");
  }

  function resetToIntro() {
    setErrorMessage(null);
    setErrorQuote(null);
    setAnswers([]);
    setCurrent(0);
    setResult(null);
    setPhase("intro");
  }

  // ── INTRO ──────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <RitualShell>
        <div className="max-w-lg mx-auto text-center py-16 sm:py-24 px-6 animate-[slide-up_0.5s_ease-out]">
          <div className="text-[10px] sm:text-xs font-ritual tracking-[0.35em] text-cold-steel uppercase mb-10">
            — Определение —
          </div>
          <h1 className="font-verse text-3xl sm:text-4xl text-text-primary leading-tight mb-6">
            Пять ситуаций.
            <br />
            <span className="italic text-text-secondary">Твои ответы.</span>
          </h1>
          <p className="font-verse italic text-base sm:text-lg text-text-secondary leading-relaxed mb-2">
            Правильных ответов нет.
          </p>
          <p className="font-verse italic text-base sm:text-lg text-text-secondary leading-relaxed mb-16">
            Только — твои.
          </p>
          <button
            onClick={handleStart}
            className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-10 py-4 transition-all duration-300 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)]"
          >
            Начать
          </button>
        </div>
      </RitualShell>
    );
  }

  // ── SUBMITTING ─────────────────────────────────────────────────────
  if (phase === "submitting") {
    return (
      <RitualShell>
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <div className="font-ritual text-xs tracking-[0.35em] uppercase text-cold-steel mb-6 animate-pulse">
            Система обрабатывает
          </div>
          <p className="font-verse italic text-lg text-text-secondary">
            Пожалуйста, подожди.
          </p>
        </div>
      </RitualShell>
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────────
  if (phase === "error") {
    const quote = errorQuote ?? FAILURE_QUOTES[0]!;
    return (
      <RitualShell>
        <div className="max-w-xl mx-auto text-center py-20 sm:py-28 px-6 animate-[slide-up_0.5s_ease-out]">
          <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-blood mb-10 inline-block px-4 py-1">
            — Путь прерван —
          </div>

          <div className="glass-card p-8 sm:p-12 mb-10 border-cold-steel/15 shadow-neon-steel relative">
            <span
              aria-hidden
              className="absolute top-4 left-5 sm:top-6 sm:left-7 font-verse text-4xl sm:text-5xl leading-none text-cold-steel/25 select-none"
            >
              “
            </span>
            <span
              aria-hidden
              className="absolute bottom-12 right-5 sm:bottom-14 sm:right-7 font-verse text-4xl sm:text-5xl leading-none text-cold-steel/25 select-none"
            >
              ”
            </span>
            <p className="font-verse italic text-xl sm:text-2xl leading-relaxed text-text-primary mb-6 px-4 sm:px-6">
              {quote.text}
            </p>
            <div className="font-ritual text-[10px] sm:text-xs tracking-[0.35em] uppercase text-cold-steel">
              {quote.author}
            </div>
          </div>

          {errorMessage && (
            <p className="font-sans text-xs text-text-muted mb-8 opacity-60">
              {errorMessage}
            </p>
          )}

          <button
            onClick={resetToIntro}
            className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-10 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)] transition-all duration-300"
          >
            Начать снова
          </button>
        </div>
      </RitualShell>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const levelLabel = getLevelName(result.level ?? result.startZone);
    return (
      <RitualShell>
        <div className="max-w-lg mx-auto text-center py-20 sm:py-28 px-6 animate-[slide-up_0.6s_ease-out]">
          <p className="font-verse italic text-base text-text-secondary mb-3">
            Ты назван.
          </p>
          <p className="font-verse text-xl text-text-primary mb-5">
            Твой уровень —
          </p>
          <h2
            className="inline-block font-ritual text-3xl sm:text-4xl font-bold tracking-[0.2em] pl-[0.2em] uppercase mb-6 animate-shimmer-flicker"
            style={{
              backgroundImage:
                "linear-gradient(110deg, #8B2E2E 0%, #C0392B 25%, #E8DDD3 50%, #C0392B 75%, #8B2E2E 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {levelLabel}
          </h2>
          <p className="font-verse italic text-sm sm:text-base text-text-secondary mb-14">
            Пробуждение начинается.
          </p>
          <button
            onClick={handleEnter}
            className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-12 py-4 transition-all duration-300 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)]"
          >
            Войти
          </button>
        </div>
      </RitualShell>
    );
  }

  // ── SITUATIONS ─────────────────────────────────────────────────────
  return (
    <RitualShell>
      <div className="max-w-xl mx-auto py-10 sm:py-16 px-4 sm:px-6">
        <div
          className={`glass-card p-7 sm:p-10 transition-all duration-400 shadow-neon-steel border-cold-steel/20 ${
            exiting ? "opacity-0 -translate-y-6" : "opacity-100 translate-y-0 animate-[slide-up_0.4s_ease-out]"
          }`}
        >
          <div className="flex gap-2 justify-center mb-8 sm:mb-10">
            {situations.map((_, i) => (
              <span
                key={i}
                data-testid="progress-dot"
                className={`h-[3px] w-7 rounded-sm transition-all duration-300 ${
                  i < current
                    ? "bg-cold-steel shadow-neon-steel"
                    : i === current
                      ? "bg-cold-blood animate-blood-pulse"
                      : "bg-surface-light"
                }`}
              />
            ))}
          </div>

          <div className="font-ritual text-[10px] sm:text-xs tracking-[0.35em] uppercase text-cold-steel text-center mb-6 sm:mb-8">
            {situation!.title}
          </div>

          <p className="font-verse text-xl sm:text-2xl leading-relaxed text-text-primary text-center mb-8 sm:mb-10">
            {situation!.scenario}
          </p>

          <div className="flex flex-col gap-2.5">
            {situation!.options.map((opt, i) => (
              <button
                key={i}
                data-testid="determination-option"
                onClick={() => handleChoose(i)}
                disabled={exiting}
                className="text-left text-sm sm:text-[15px] leading-snug text-text-primary border border-border rounded-xl px-4 sm:px-5 py-3.5 bg-surface-light/40 transition-all duration-200 hover:border-cold-steel hover:bg-cold-steel/10 hover:translate-x-0.5 hover:shadow-neon-steel active:border-cold-blood active:bg-cold-blood/10 active:shadow-neon-blood disabled:opacity-50"
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div className="mt-6 sm:mt-7 font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted text-center">
            Выбери своё
          </div>
        </div>
      </div>
    </RitualShell>
  );
}

function describeError(e: LearningApiError): string {
  switch (e.kind) {
    case "auth":
      return "Требуется авторизация. Войди и попробуй снова.";
    case "server":
      return "Сервер не отвечает. Попробуй позже.";
    case "client":
      return `Ошибка запроса (${e.status}).`;
    case "parse":
      return "Сервер вернул непонятный ответ.";
    default:
      return e.message;
  }
}
