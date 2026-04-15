"use client";

/**
 * F22.7 — ExplainCard
 * "Своими словами": пользователь формулирует мысль, AI-наставник возвращает
 * вердикт (уловил / частично / не уловил) + фидбэк. Минимальный UI:
 * textarea с нижней линией вместо рамки, текстовые кнопки.
 */

import { useState } from "react";

export type ExplainVerdict = "caught" | "partial" | "missed";

export interface ExplainResult {
  verdict: ExplainVerdict;
  feedback: string;
}

export interface ExplainCardProps {
  prompt: string;
  onSubmit: (text: string) => Promise<ExplainResult>;
  onDiscuss?: () => void;
}

type Phase = "idle" | "loading" | "result";

const VERDICT_LABEL: Record<ExplainVerdict, string> = {
  caught: "Уловил",
  partial: "Частично",
  missed: "Не уловил",
};

const VERDICT_COLOR: Record<ExplainVerdict, string> = {
  caught: "#87B08E",
  partial: "#B98D34",
  missed: "#B98787",
};

function VerdictMark({ verdict }: { verdict: ExplainVerdict }) {
  const color = VERDICT_COLOR[verdict];
  if (verdict === "caught") {
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

export function ExplainCard({ prompt, onSubmit, onDiscuss }: ExplainCardProps) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || phase === "loading") return;
    setPhase("loading");
    setError(null);
    try {
      const res = await onSubmit(trimmed);
      setResult(res);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Наставник молчит");
      setPhase("idle");
    }
  }

  function handleReset() {
    setText("");
    setResult(null);
    setPhase("idle");
    setError(null);
  }

  const canSubmit = text.trim().length > 0 && phase !== "loading";

  return (
    <section
      aria-label="Своими словами"
      className="w-full max-w-xl mx-auto py-10 sm:py-14 px-5 sm:px-8"
    >
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.35em] uppercase text-text-secondary text-center mb-6">
        — Своими словами —
      </div>

      <h3 className="font-ritual text-xl sm:text-2xl leading-snug text-text-primary text-center mb-10 tracking-wide">
        {prompt}
      </h3>

      <div className="relative mb-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={phase !== "idle"}
          placeholder="Объясни своими словами…"
          aria-label="Объяснение своими словами"
          rows={8}
          className="w-full bg-transparent resize-none outline-none font-verse text-base sm:text-lg leading-relaxed text-text-primary placeholder:text-text-muted placeholder:italic border-0 border-b border-border focus:border-accent transition-colors duration-300 pb-3 pt-1 px-0 disabled:opacity-70"
        />
        {phase === "idle" && text.length === 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-1 w-px h-6 bg-accent animate-pulse"
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
            className="font-ritual text-xs tracking-[0.35em] uppercase text-text-primary hover:text-accent transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed py-2"
          >
            Отправить
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="mt-10 text-center">
          <p className="font-verse italic text-base sm:text-lg text-text-secondary animate-pulse">
            …наставник читает
          </p>
        </div>
      )}

      {phase === "result" && result && (
        <div className="mt-10 animate-[slide-up_0.4s_ease-out]">
          <div className="flex items-center justify-center gap-3 mb-5">
            <VerdictMark verdict={result.verdict} />
            <span
              className="font-ritual text-sm tracking-[0.35em] uppercase"
              style={{ color: VERDICT_COLOR[result.verdict] }}
            >
              {VERDICT_LABEL[result.verdict]}
            </span>
          </div>

          <p className="font-verse text-base sm:text-lg leading-relaxed text-text-primary text-center mb-8 px-2">
            {result.feedback}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {onDiscuss && (
              <button
                type="button"
                onClick={onDiscuss}
                className="font-ritual text-xs tracking-[0.35em] uppercase text-text-primary hover:text-accent transition-colors duration-300 py-2"
              >
                Обсудить с наставником
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="font-ritual text-xs tracking-[0.35em] uppercase text-text-secondary hover:text-text-primary transition-colors duration-300 py-2"
            >
              Переписать
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ExplainCard;
