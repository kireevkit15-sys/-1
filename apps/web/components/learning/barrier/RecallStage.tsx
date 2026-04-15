"use client";

/**
 * F24.2 — RecallStage
 * Этап барьер-испытания "Вспомни": 6 коротких вопросов, открытый ответ (1–2 предложения),
 * цветовая оценка (зелёный / янтарный / бордовый).
 * Атмосфера холодная, бордовый акцент (`cold-blood`).
 */

import { useState } from "react";

export type RecallVerdict = "green" | "yellow" | "red";

export interface RecallQuestion {
  id: string;
  prompt: string;
}

export interface RecallAnswer {
  questionId: string;
  text: string;
  verdict: RecallVerdict;
}

export interface RecallStageProps {
  questions: RecallQuestion[]; // длина 6
  /** Возвращает вердикт для одного ответа. AI-оценка на стороне вызова. */
  grade: (question: RecallQuestion, answer: string) => Promise<RecallVerdict>;
  /** Вызывается после ответа на все 6 вопросов. */
  onComplete: (answers: RecallAnswer[]) => void;
}

type Phase = "idle" | "loading" | "verdict";

const VERDICT_LABEL: Record<RecallVerdict, string> = {
  green: "Верно",
  yellow: "Почти",
  red: "Не уловил",
};

const VERDICT_COLOR: Record<RecallVerdict, string> = {
  green: "#4F7A54",
  yellow: "#B98D34",
  red: "#8B2E2E",
};

const NEXT_DELAY_MS = 1200;

export function RecallStage({ questions, grade, onComplete }: RecallStageProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [verdict, setVerdict] = useState<RecallVerdict | null>(null);
  const [collected, setCollected] = useState<RecallAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const question = questions[index];

  if (!question) {
    return null;
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle" || !question) return;
    setPhase("loading");
    setError(null);
    try {
      const v = await grade(question, trimmed);
      const answer: RecallAnswer = {
        questionId: question.id,
        text: trimmed,
        verdict: v,
      };
      const next = [...collected, answer];
      setCollected(next);
      setVerdict(v);
      setPhase("verdict");

      window.setTimeout(() => {
        if (index + 1 < total) {
          setIndex(index + 1);
          setText("");
          setVerdict(null);
          setPhase("idle");
        } else {
          onComplete(next);
        }
      }, NEXT_DELAY_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Система молчит");
      setPhase("idle");
    }
  }

  const canSubmit = text.trim().length > 0 && phase === "idle";
  const borderColor = verdict ? VERDICT_COLOR[verdict] : "transparent";

  return (
    <section
      aria-label="Вспомни"
      className="w-full max-w-xl mx-auto py-10 sm:py-14 px-5 sm:px-8"
    >
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-blood text-center mb-8">
        — Вспомни —
      </div>

      <div
        className="relative transition-[border-color,box-shadow] duration-500 pl-5 sm:pl-6"
        style={{
          borderLeft: "2px solid",
          borderLeftColor: borderColor,
          boxShadow:
            phase === "verdict" && verdict
              ? `-12px 0 24px -12px ${VERDICT_COLOR[verdict]}66`
              : "none",
        }}
      >
        <h3 className="font-ritual text-lg sm:text-xl leading-snug text-text-primary mb-6 tracking-wide">
          {question.prompt}
        </h3>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={phase !== "idle"}
          placeholder="Коротко — 1–2 предложения…"
          aria-label="Ответ на вопрос"
          rows={3}
          className="w-full bg-transparent resize-none outline-none font-verse text-base leading-relaxed text-text-primary placeholder:text-text-muted placeholder:italic border-0 border-b border-border focus:border-cold-blood transition-colors duration-300 pb-3 pt-1 px-0 disabled:opacity-70"
        />

        {error && (
          <p className="font-sans text-xs text-cold-blood mt-3 opacity-80">
            {error}
          </p>
        )}

        {phase === "idle" && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="font-ritual text-xs tracking-[0.35em] uppercase text-text-primary hover:text-cold-blood transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed py-2"
            >
              Ответить
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="mt-6 text-center">
            <p className="font-verse italic text-base text-text-secondary animate-pulse">
              …система оценивает
            </p>
          </div>
        )}

        {phase === "verdict" && verdict && (
          <div className="mt-6 flex items-center gap-3 animate-[slide-up_0.4s_ease-out]">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: VERDICT_COLOR[verdict],
                boxShadow: `0 0 12px ${VERDICT_COLOR[verdict]}`,
              }}
            />
            <span
              className="font-ritual text-xs sm:text-sm tracking-[0.35em] uppercase"
              style={{ color: VERDICT_COLOR[verdict] }}
            >
              {VERDICT_LABEL[verdict]}
            </span>
          </div>
        )}
      </div>

      <div className="mt-10 text-center font-ritual text-[10px] tracking-[0.4em] uppercase text-text-muted">
        {Math.min(index + 1, total)} / {total}
      </div>
    </section>
  );
}

export default RecallStage;
