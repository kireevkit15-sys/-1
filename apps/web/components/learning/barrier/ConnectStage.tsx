"use client";

/**
 * F24.3 — ConnectStage
 * Этап барьер-испытания "Свяжи": 3 пары концептов, пользователь пишет связь
 * своими словами, AI оценивает (strong / weak / missed) + даёт feedback.
 * Атмосфера холодная, бордовый акцент (`cold-blood`).
 */

import { useState } from "react";

export interface ConceptPair {
  id: string;
  left: string; // название концепта A
  right: string; // название концепта B
}

export type ConnectVerdict = "strong" | "weak" | "missed";

export interface ConnectAnswer {
  pairId: string;
  text: string;
  verdict: ConnectVerdict;
  feedback: string;
}

export interface ConnectStageProps {
  pairs: ConceptPair[]; // длина 3
  grade: (
    pair: ConceptPair,
    answer: string,
  ) => Promise<{ verdict: ConnectVerdict; feedback: string }>;
  onComplete: (answers: ConnectAnswer[]) => void;
}

type Phase = "idle" | "loading" | "verdict";

const VERDICT_LABEL: Record<ConnectVerdict, string> = {
  strong: "Прочная связь",
  weak: "Слабая связь",
  missed: "Мимо",
};

const VERDICT_COLOR: Record<ConnectVerdict, string> = {
  strong: "#4F7A54",
  weak: "#B98D34",
  missed: "#8B2E2E",
};

function VerdictIcon({ verdict }: { verdict: ConnectVerdict }) {
  const color = VERDICT_COLOR[verdict];
  if (verdict === "strong") {
    return (
      <svg
        aria-hidden
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10h14" />
        <path d="M6 7l-3 3 3 3" />
        <path d="M14 7l3 3-3 3" />
      </svg>
    );
  }
  if (verdict === "weak") {
    return (
      <svg
        aria-hidden
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 3"
      >
        <path d="M3 10h14" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l12 12" />
      <path d="M16 4L4 16" />
    </svg>
  );
}

export function ConnectStage({ pairs, grade, onComplete }: ConnectStageProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<{
    verdict: ConnectVerdict;
    feedback: string;
  } | null>(null);
  const [collected, setCollected] = useState<ConnectAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const total = pairs.length;
  const pair = pairs[index];

  if (!pair) {
    return null;
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle" || !pair) return;
    setPhase("loading");
    setError(null);
    try {
      const res = await grade(pair, trimmed);
      setCurrent(res);
      setCollected((prev) => [
        ...prev,
        {
          pairId: pair.id,
          text: trimmed,
          verdict: res.verdict,
          feedback: res.feedback,
        },
      ]);
      setPhase("verdict");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Система молчит");
      setPhase("idle");
    }
  }

  function handleNext() {
    if (phase !== "verdict") return;
    if (index + 1 < total) {
      setIndex(index + 1);
      setText("");
      setCurrent(null);
      setPhase("idle");
    } else {
      onComplete(collected);
    }
  }

  const canSubmit = text.trim().length > 0 && phase === "idle";
  const isLast = index + 1 >= total;

  return (
    <section
      aria-label="Свяжи"
      className="w-full max-w-xl mx-auto py-10 sm:py-14 px-5 sm:px-8"
    >
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-blood text-center mb-8">
        — Свяжи —
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5 mb-8">
        <div className="flex-1 border border-border rounded-xl px-5 py-5 bg-surface-light/40 text-center">
          <div className="font-ritual text-[9px] tracking-[0.35em] uppercase text-text-muted mb-2">
            Концепт
          </div>
          <div className="font-ritual text-base sm:text-lg text-text-primary tracking-wide">
            {pair.left}
          </div>
        </div>

        <div
          aria-hidden
          className="flex items-center justify-center sm:flex-col"
        >
          <span className="hidden sm:block w-px h-10 bg-cold-blood" />
          <span className="sm:hidden block h-px w-10 bg-cold-blood" />
          <span className="font-ritual text-sm sm:text-base text-cold-blood mx-3 sm:mx-0 sm:my-2 tracking-widest">
            ↔
          </span>
          <span className="hidden sm:block w-px h-10 bg-cold-blood" />
          <span className="sm:hidden block h-px w-10 bg-cold-blood" />
        </div>

        <div className="flex-1 border border-border rounded-xl px-5 py-5 bg-surface-light/40 text-center">
          <div className="font-ritual text-[9px] tracking-[0.35em] uppercase text-text-muted mb-2">
            Концепт
          </div>
          <div className="font-ritual text-base sm:text-lg text-text-primary tracking-wide">
            {pair.right}
          </div>
        </div>
      </div>

      <div className="mb-2">
        <p className="font-verse italic text-sm text-text-secondary text-center mb-3">
          Как они связаны?
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={phase !== "idle"}
          placeholder="Опиши связь своими словами…"
          rows={4}
          className="w-full bg-transparent resize-none outline-none font-verse text-base leading-relaxed text-text-primary placeholder:text-text-muted placeholder:italic border-0 border-b border-border focus:border-cold-blood transition-colors duration-300 pb-3 pt-1 px-0 disabled:opacity-70"
        />
      </div>

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
        <div className="mt-8 text-center">
          <p className="font-verse italic text-base text-text-secondary animate-pulse">
            …система оценивает
          </p>
        </div>
      )}

      {phase === "verdict" && current && (
        <div className="mt-8 animate-[slide-up_0.4s_ease-out]">
          <div className="flex items-center justify-center gap-3 mb-4">
            <VerdictIcon verdict={current.verdict} />
            <span
              className="font-ritual text-sm tracking-[0.35em] uppercase"
              style={{ color: VERDICT_COLOR[current.verdict] }}
            >
              {VERDICT_LABEL[current.verdict]}
            </span>
          </div>

          <p className="font-verse text-base sm:text-lg leading-relaxed text-text-primary text-center mb-8 px-2">
            {current.feedback}
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleNext}
              className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-blood rounded-xl px-10 py-3 shadow-neon-blood hover:bg-cold-blood hover:text-background hover:tracking-[0.5em] transition-all duration-300"
            >
              {isLast ? "Завершить" : "Дальше"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 text-center font-ritual text-[10px] tracking-[0.4em] uppercase text-text-muted">
        {Math.min(index + 1, total)} / {total}
      </div>
    </section>
  );
}

export default ConnectStage;
