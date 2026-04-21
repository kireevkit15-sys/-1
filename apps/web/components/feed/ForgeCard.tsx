"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ─── types ─── */
interface ForgeCardProps {
  data: {
    originalCardId: string;
    questionId: string;
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    failedAt: string;
    attempt: number;
  };
  branch: string;
  onAnswer?: (isCorrect: boolean, answerIndex: number, timeTakenMs: number) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];
const MAX_ATTEMPTS = 5;

/* ─── helpers ─── */
function daysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(1, Math.floor(diff / 86_400_000));
}

function daysWord(n: number): string {
  if (n === 1) return "день";
  if (n >= 2 && n <= 4) return "дня";
  return "дней";
}

function nextReturnDays(attempt: number): number {
  // exponential spacing: 1, 3, 7, 14, 30
  const schedule = [1, 3, 7, 14, 30];
  return schedule[Math.min(attempt, schedule.length - 1)] ?? 30;
}

/* ─── component ─── */
export default function ForgeCard({ data, onAnswer }: ForgeCardProps) {
  // ForgeCard использует свою собственную цветовую палитру (огонь/красный) — branch-цвет не нужен
  const [selected, setSelected] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const answered = selected !== null;
  const isCorrect = selected === data.correctIndex;

  /* live timer */
  useEffect(() => {
    if (answered) return;
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [answered]);

  /* delayed result reveal */
  useEffect(() => {
    if (!answered) return;
    const timer = setTimeout(() => setShowResult(true), 400);
    return () => clearTimeout(timer);
  }, [answered]);

  const handleSelect = useCallback(
    (index: number) => {
      if (answered) return;
      if (timerRef.current) clearInterval(timerRef.current);
      const finalTime = Date.now() - startRef.current;
      setElapsedMs(finalTime);
      setSelected(index);
      onAnswer?.(index === data.correctIndex, index, finalTime);
    },
    [answered, data.correctIndex, onAnswer],
  );

  const days = daysAgo(data.failedAt);
  const returnDays = nextReturnDays(data.attempt);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col px-4 py-6">
      {/* fire-themed ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, #F97316 0%, #EF4444 30%, transparent 70%)",
        }}
      />

      {/* forge accent border — top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-500/[0.04] to-transparent pointer-events-none" />

      {/* ── Badge + attempt counter ── */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-orange-500/40 bg-orange-500/10 text-orange-400">
          {/* fire icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C9 7 5 10 5 14a7 7 0 0014 0c0-4-4-7-7-12z" />
            <path d="M12 22c-2 0-3.5-1.5-3.5-3.5 0-2 3.5-5.5 3.5-5.5s3.5 3.5 3.5 5.5c0 2-1.5 3.5-3.5 3.5z" />
          </svg>
          ЗАКАЛКА
        </span>

        {/* attempt counter */}
        <span className="text-[11px] text-orange-400/70 font-medium font-mono">
          Попытка {data.attempt} из {MAX_ATTEMPTS}
        </span>
      </div>

      {/* ── Redemption message ── */}
      <div className="relative z-10 flex items-start gap-3 bg-orange-500/[0.06] border border-orange-500/15 rounded-xl px-4 py-3 mb-6">
        <svg className="w-5 h-5 text-orange-400/70 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-orange-400/90 leading-relaxed">
          Ты ошибся тут{" "}
          <span className="font-bold text-orange-400">
            {days === 1 ? "вчера" : `${days} ${daysWord(days)} назад`}
          </span>
          . Попробуй снова.
        </p>
      </div>

      {/* ── Question ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
          {data.text}
        </h2>
      </div>

      {/* ── Options ── */}
      <div className="relative z-10 space-y-3 mb-6">
        {data.options.map((opt, idx) => {
          const isThis = selected === idx;
          const isRight = idx === data.correctIndex;

          let borderStyle = "1px solid rgba(255,255,255,0.08)";
          let bgStyle = "rgba(17,17,20,0.8)";
          let extraClasses = "";
          let iconContent: React.ReactNode = (
            <span className="text-text-muted text-xs font-semibold">{OPTION_LETTERS[idx]}</span>
          );

          if (answered) {
            if (isRight) {
              borderStyle = "1px solid rgba(34,197,94,0.5)";
              bgStyle = "rgba(34,197,94,0.08)";
              extraClasses = "animate-correct-glow";
              iconContent = (
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              );
            } else if (isThis && !isCorrect) {
              borderStyle = "1px solid rgba(239,68,68,0.5)";
              bgStyle = "rgba(239,68,68,0.08)";
              extraClasses = "animate-shake";
              iconContent = (
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              );
            } else {
              bgStyle = "rgba(17,17,20,0.4)";
              borderStyle = "1px solid rgba(255,255,255,0.03)";
              extraClasses = "opacity-40";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answered}
              className={`
                group w-full text-left rounded-xl px-4 py-3.5
                transition-all duration-200
                ${!answered ? "active:scale-[0.97] hover:scale-[1.01]" : ""}
                ${extraClasses}
              `}
              style={{
                border: borderStyle,
                backgroundColor: bgStyle,
                ...(answered && isRight
                  ? { boxShadow: "0 0 20px rgba(34,197,94,0.15), 0 0 40px rgba(34,197,94,0.05)" }
                  : {}),
                ...(answered && isThis && !isCorrect
                  ? { boxShadow: "0 0 20px rgba(239,68,68,0.15), 0 0 40px rgba(239,68,68,0.05)" }
                  : {}),
              }}
              onMouseEnter={(e) => {
                if (!answered) {
                  e.currentTarget.style.borderColor = "rgba(249,115,22,0.33)";
                  e.currentTarget.style.boxShadow = "0 0 15px rgba(249,115,22,0.12), 0 0 30px rgba(249,115,22,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!answered) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`
                    w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0
                    transition-colors duration-200
                    ${answered && isRight ? "border-green-500/50 bg-green-500/20" : ""}
                    ${answered && isThis && !isCorrect ? "border-red-500/50 bg-red-500/20" : ""}
                    ${!answered ? "border-white/10 group-hover:border-white/20" : ""}
                    ${answered && !isRight && !isThis ? "border-white/5" : ""}
                  `}
                >
                  {iconContent}
                </span>
                <span
                  className={`text-sm font-medium leading-snug ${
                    answered && isRight
                      ? "text-green-300"
                      : answered && isThis && !isCorrect
                        ? "text-red-300"
                        : answered
                          ? "text-text-muted"
                          : "text-text-primary"
                  }`}
                >
                  {opt}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Result ── */}
      {showResult && (
        <div className="relative z-10 space-y-4 animate-[count-up_0.4s_ease-out]">
          {/* outcome banner */}
          <div
            className={`text-center py-4 rounded-xl font-black text-lg tracking-wide ${
              isCorrect
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                : "bg-surface-light text-text-secondary border border-border"
            }`}
          >
            {isCorrect ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl">ВЫКОВАНО!</span>
                <span className="text-xs font-normal text-orange-400/60">
                  Исправлено! +20 XP
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-base">Вернётся через {returnDays} {daysWord(returnDays)}</span>
                <span className="text-xs font-normal text-text-muted">
                  Каждая попытка делает тебя сильнее
                </span>
              </div>
            )}
          </div>

          {/* explanation */}
          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1.5">Объяснение</p>
            <p className="text-sm text-text-secondary leading-relaxed">{data.explanation}</p>
          </div>

          {/* swipe hint */}
          <div className="flex justify-center pt-2">
            <div className="flex flex-col items-center gap-1 text-text-muted animate-bounce">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              <span className="text-[10px] uppercase tracking-widest">Свайпни вверх</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
