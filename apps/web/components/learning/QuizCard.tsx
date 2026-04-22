"use client";

/**
 * F22.6 — QuizCard
 * "Проверка": вопрос на осмысление, 4 варианта. После ответа раскрывается
 * разбор КАЖДОГО варианта: зелёная линия у верных, приглушённо-красная у
 * неверных, выбранный пользователем — с дополнительной рамкой.
 */

import { useState } from "react";

export interface QuizOption {
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizCardProps {
  question: string;
  options: QuizOption[];
  onAnswered?: (isCorrect: boolean) => void;
}

export function QuizCard({ question, options, onAnswered }: QuizCardProps) {
  const [chosen, setChosen] = useState<number | null>(null);

  function handleChoose(index: number) {
    if (chosen !== null) return;
    setChosen(index);
    onAnswered?.(options[index]?.isCorrect ?? false);
  }

  const answered = chosen !== null;

  return (
    <section
      aria-label="Проверка"
      className="w-full max-w-xl mx-auto py-10 sm:py-14 px-5 sm:px-8"
    >
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.35em] uppercase text-text-secondary text-center mb-6">
        — Проверка —
      </div>

      <h3 className="font-verse text-xl sm:text-2xl leading-relaxed text-text-primary text-center mb-8 sm:mb-10">
        {question}
      </h3>

      <ul className="flex flex-col gap-3">
        {options.map((opt, i) => {
          const isChosen = chosen === i;
          const showAnalysis = answered;

          const baseBorder = showAnalysis
            ? opt.isCorrect
              ? "border-l-2 border-l-[#4F7A54] border-y border-r border-border"
              : "border-l-2 border-l-[#7A3A3A] border-y border-r border-border"
            : "border border-border";

          const chosenRing = isChosen
            ? "ring-1 ring-accent/50 shadow-neon-accent"
            : "";

          const hoverIdle = !answered
            ? "hover:border-accent/60 hover:bg-accent/5 hover:translate-x-0.5"
            : "";

          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleChoose(i)}
                disabled={answered}
                aria-pressed={isChosen}
                className={`w-full min-h-14 text-left text-sm sm:text-[15px] leading-snug text-text-primary rounded-xl px-4 sm:px-5 py-3.5 bg-surface-light/40 transition-all duration-200 disabled:cursor-default ${baseBorder} ${chosenRing} ${hoverIdle}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-ritual text-[11px] tracking-[0.25em] mt-0.5 ${
                      showAnalysis
                        ? opt.isCorrect
                          ? "text-success-soft"
                          : "text-error-soft"
                        : "text-text-secondary"
                    }`}
                    aria-hidden
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                </div>
              </button>

              {showAnalysis && (
                <p
                  className={`font-verse italic text-sm sm:text-[15px] leading-relaxed px-4 sm:px-5 pt-3 pb-1 ${
                    opt.isCorrect ? "text-text-primary" : "text-text-secondary"
                  } animate-[slide-up_0.4s_ease-out]`}
                >
                  <span
                    className={`font-ritual not-italic text-[10px] tracking-[0.3em] uppercase mr-2 ${
                      opt.isCorrect ? "text-success-soft" : "text-error-soft"
                    }`}
                  >
                    {opt.isCorrect ? "Верно" : "Мимо"}
                  </span>
                  {opt.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default QuizCard;
