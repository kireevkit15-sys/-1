"use client";

/**
 * F24.4 — ApplyStage
 * Этап барьер-испытания "Примени": пользователю даются 2 новые ситуации,
 * он должен применить изученные концепты к ним. AI оценивает применение:
 * applied / partial / missed + текстовый feedback.
 */

import { useState } from "react";

export interface ApplySituation {
  id: string;
  scenario: string;
  concepts: string[];
}

export type ApplyVerdict = "applied" | "partial" | "missed";

export interface ApplyAnswer {
  situationId: string;
  text: string;
  verdict: ApplyVerdict;
  feedback: string;
}

export interface ApplyStageProps {
  situations: ApplySituation[];
  grade: (
    situation: ApplySituation,
    answer: string,
  ) => Promise<{ verdict: ApplyVerdict; feedback: string }>;
  onComplete: (answers: ApplyAnswer[]) => void;
}

type Phase = "idle" | "loading" | "result" | "error";

const VERDICT_LABEL: Record<ApplyVerdict, string> = {
  applied: "Применил",
  partial: "Частично",
  missed: "Не применил",
};

const VERDICT_COLOR: Record<ApplyVerdict, string> = {
  applied: "#87B08E",
  partial: "#B98D34",
  missed: "#B98787",
};

function VerdictMark({ verdict }: { verdict: ApplyVerdict }) {
  const color = VERDICT_COLOR[verdict];
  if (verdict === "applied") {
    return (
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5l4 4 8-9" />
      </svg>
    );
  }
  if (verdict === "partial") {
    return (
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M3 9h12" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  );
}

export function ApplyStage({ situations, grade, onComplete }: ApplyStageProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<{
    verdict: ApplyVerdict;
    feedback: string;
  } | null>(null);
  const [answers, setAnswers] = useState<ApplyAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const situation = situations[index];
  const total = situations.length;

  if (!situation) {
    return (
      <section className="w-full max-w-xl mx-auto py-16 px-5 sm:px-8 text-center">
        <p className="font-verse italic text-text-secondary">
          Ситуаций нет.
        </p>
      </section>
    );
  }

  async function handleSubmit() {
    if (!situation) return;
    const trimmed = text.trim();
    if (!trimmed || phase === "loading") return;
    setPhase("loading");
    setError(null);
    try {
      const res = await grade(situation, trimmed);
      setCurrent(res);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Наставник молчит");
      setPhase("idle");
    }
  }

  function handleNext() {
    if (!current || !situation) return;
    const answer: ApplyAnswer = {
      situationId: situation.id,
      text: text.trim(),
      verdict: current.verdict,
      feedback: current.feedback,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);

    if (index + 1 < total) {
      setIndex(index + 1);
      setText("");
      setCurrent(null);
      setError(null);
      setPhase("idle");
    } else {
      onComplete(nextAnswers);
    }
  }

  const isLast = index + 1 >= total;
  const canSubmit = text.trim().length > 0 && phase !== "loading";

  return (
    <section
      aria-label="Примени"
      className="w-full max-w-xl mx-auto py-10 sm:py-14 px-5 sm:px-8"
    >
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.35em] uppercase text-cold-blood text-center mb-3">
        — Примени —
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {situations.map((_, i) => (
          <span
            key={i}
            className={`h-[2px] w-8 rounded-sm transition-all duration-300 ${
              i < index
                ? "bg-cold-blood/70"
                : i === index
                  ? "bg-cold-blood animate-blood-pulse"
                  : "bg-surface-light"
            }`}
          />
        ))}
      </div>

      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.3em] uppercase text-text-muted text-center mb-6">
        Ситуация {index + 1} / {total}
      </div>

      <div
        className="mx-auto mb-5 bg-surface-light rounded-lg px-5 sm:px-6 py-5 sm:py-6 border-l-2 border-cold-blood animate-[slide-up_0.5s_ease-out]"
        style={{ maxWidth: "60ch" }}
      >
        <p className="font-verse italic text-base sm:text-lg leading-relaxed text-text-primary">
          {situation.scenario}
        </p>
      </div>

      {situation.concepts.length > 0 && (
        <p className="font-sans text-[11px] sm:text-xs text-text-muted text-center tracking-wide mb-8">
          применить:{" "}
          <span className="text-text-secondary">
            {situation.concepts.join(" · ")}
          </span>
        </p>
      )}

      {(phase === "idle" || phase === "loading") && (
        <>
          <div className="relative mb-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={phase === "loading"}
              placeholder="Как ты применишь это здесь?"
              rows={6}
              className="w-full bg-transparent resize-none outline-none font-verse text-base sm:text-lg leading-relaxed text-text-primary placeholder:text-text-muted placeholder:italic border-0 border-b border-border focus:border-cold-blood transition-colors duration-300 pb-3 pt-1 px-0 disabled:opacity-70"
            />
            {phase === "idle" && text.length === 0 && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-1 w-px h-6 bg-cold-blood animate-pulse"
              />
            )}
          </div>

          {error && (
            <p className="font-sans text-xs text-[#B98787] mb-4 opacity-80">
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
                Отправить
              </button>
            </div>
          )}

          {phase === "loading" && (
            <div className="mt-10 text-center">
              <p className="font-verse italic text-base sm:text-lg text-text-secondary animate-pulse">
                …наставник взвешивает
              </p>
            </div>
          )}
        </>
      )}

      {phase === "result" && current && (
        <div className="mt-6 animate-[slide-up_0.4s_ease-out]">
          <div className="flex items-center justify-center gap-3 mb-5">
            <VerdictMark verdict={current.verdict} />
            <span
              className="font-ritual text-sm tracking-[0.35em] uppercase"
              style={{ color: VERDICT_COLOR[current.verdict] }}
            >
              {VERDICT_LABEL[current.verdict]}
            </span>
          </div>

          <p className="font-verse text-base sm:text-lg leading-relaxed text-text-primary text-center mb-10 px-2">
            {current.feedback}
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleNext}
              className="font-ritual text-xs tracking-[0.35em] uppercase text-text-primary hover:text-cold-blood transition-colors duration-300 py-2"
            >
              {isLast ? "Завершить" : "Следующая"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ApplyStage;
