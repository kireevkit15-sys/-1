"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getBranch } from "@/lib/branches";

// ─── Props ─────────────────────────────────────────────────────

interface ChallengeCardProps {
  data: {
    questionId: string;
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    xpReward: number;
  };
  branch: string;
  communityStats?: { totalAnswers: number; correctPercent: number };
  onAnswer?: (correct: boolean, answerIndex: number) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

// ─── Component ─────────────────────────────────────────────────

export default function ChallengeCard({
  data,
  branch,
  communityStats,
  onAnswer,
}: ChallengeCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [pulsedIndex, setPulsedIndex] = useState<number | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === data.correctIndex;
  const meta = getBranch(branch);

  // ── Elapsed timer ──
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Post-answer effects ──
  useEffect(() => {
    if (!isAnswered) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // XP float animation
    setShowXp(true);

    // Green ripple on correct
    if (isCorrect) {
      setShowRipple(true);
    }

    // Slide in explanation after delay
    const timer = setTimeout(() => setShowExplanation(true), 500);
    return () => clearTimeout(timer);
  }, [isAnswered, isCorrect]);

  // ── Handle option tap ──
  const handleSelect = useCallback(
    (index: number) => {
      if (isAnswered) return;

      // Scale pulse feedback
      setPulsedIndex(index);
      setTimeout(() => setPulsedIndex(null), 200);

      const timeTaken = Date.now() - startTimeRef.current;
      setSelectedIndex(index);
      setElapsedMs(timeTaken);
      onAnswer?.(index === data.correctIndex, index);
    },
    [isAnswered, data.correctIndex, onAnswer],
  );

  // ── Format elapsed time ──
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
    }
    return `${seconds}.${tenths}с`;
  };

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col px-4 py-6 overflow-hidden">
      {/* ── Ambient background glow ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${meta.color} 0%, transparent 70%)`,
        }}
      />

      {/* ── Green ripple on correct answer ── */}
      {showRipple && (
        <div
          className="pointer-events-none absolute inset-0 z-30 animate-ripple-out"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* ── Top: badge + branch pill + timer ── */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {/* ВЫЗОВ badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest"
            style={{
              borderColor: `${meta.color}44`,
              backgroundColor: `${meta.color}12`,
              color: meta.color,
            }}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Вызов</span>
          </div>

          {/* Branch pill */}
          <div
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: `${meta.color}10`,
              color: `${meta.color}cc`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </div>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-light/80 border border-border text-sm font-mono tabular-nums ${
            !isAnswered ? "animate-pulse-critical" : ""
          }`}
          style={
            isAnswered
              ? {
                  borderColor: isCorrect ? "#22C55E44" : "#EF444444",
                  color: isCorrect ? "#22C55E" : "#EF4444",
                }
              : { color: meta.color }
          }
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 6v6l4 2" />
          </svg>
          {formatTime(elapsedMs)}
        </div>
      </div>

      {/* ── Question text ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
          {data.text}
        </h2>
      </div>

      {/* ── Options ── */}
      <div className="relative z-10 space-y-3 mb-6">
        {data.options.map((option, index) => {
          const isThis = selectedIndex === index;
          const isRight = index === data.correctIndex;
          const isPulsing = pulsedIndex === index;

          // Determine visual state
          let borderStyle = "1px solid rgba(255,255,255,0.08)";
          let bgStyle = "rgba(17,17,20,0.8)";
          let extraClasses = "";
          let iconContent: React.ReactNode = (
            <span className="text-text-muted text-xs font-semibold">
              {OPTION_LETTERS[index]}
            </span>
          );

          if (isAnswered) {
            if (isRight) {
              borderStyle = "1px solid rgba(34,197,94,0.5)";
              bgStyle = "rgba(34,197,94,0.08)";
              extraClasses = "animate-correct-glow";
              iconContent = (
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              );
            } else if (isThis && !isCorrect) {
              borderStyle = "1px solid rgba(239,68,68,0.5)";
              bgStyle = "rgba(239,68,68,0.08)";
              extraClasses = "animate-shake";
              iconContent = (
                <svg
                  className="w-4 h-4 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
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
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isAnswered}
              className={`
                group w-full text-left rounded-xl px-4 py-3.5
                backdrop-blur-sm transition-all duration-200
                ${!isAnswered ? "active:scale-[0.97] hover:scale-[1.01]" : ""}
                ${isPulsing ? "scale-[1.03]" : ""}
                ${extraClasses}
              `}
              style={{
                border: borderStyle,
                backgroundColor: bgStyle,
                transition: "all 200ms ease",
                ...(isAnswered && isRight
                  ? {
                      boxShadow:
                        "0 0 20px rgba(34,197,94,0.15), 0 0 40px rgba(34,197,94,0.05)",
                    }
                  : {}),
                ...(isAnswered && isThis && !isCorrect
                  ? {
                      boxShadow:
                        "0 0 20px rgba(239,68,68,0.15), 0 0 40px rgba(239,68,68,0.05)",
                    }
                  : {}),
              }}
              onMouseEnter={(e) => {
                if (!isAnswered) {
                  e.currentTarget.style.borderColor = `${meta.color}55`;
                  e.currentTarget.style.boxShadow = `0 0 15px ${meta.color}20, 0 0 30px ${meta.color}08`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isAnswered) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              <div className="flex items-center gap-3">
                {/* Letter circle / icon */}
                <span
                  className={`
                    w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0
                    transition-colors duration-200
                    ${isAnswered && isRight ? "border-green-500/50 bg-green-500/20" : ""}
                    ${isAnswered && isThis && !isCorrect ? "border-red-500/50 bg-red-500/20" : ""}
                    ${!isAnswered ? "border-white/10 group-hover:border-white/20" : ""}
                    ${isAnswered && !isRight && !isThis ? "border-white/5" : ""}
                  `}
                >
                  {iconContent}
                </span>

                {/* Option text */}
                <span
                  className={`text-sm font-medium leading-snug ${
                    isAnswered && isRight
                      ? "text-green-300"
                      : isAnswered && isThis && !isCorrect
                        ? "text-red-300"
                        : isAnswered
                          ? "text-text-muted"
                          : "text-text-primary"
                  }`}
                >
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── XP reward float-up ── */}
      {showXp && isCorrect && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <span className="animate-float-up text-2xl font-black text-green-400 drop-shadow-lg">
            +{data.xpReward} XP
          </span>
        </div>
      )}

      {showXp && !isCorrect && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <span className="animate-float-up text-2xl font-black text-red-400/70 drop-shadow-lg">
            +0 XP
          </span>
        </div>
      )}

      {/* ── Explanation panel — slides up ── */}
      <div
        className={`
          relative z-10 rounded-2xl border border-white/[0.06] bg-surface/90 backdrop-blur-sm
          overflow-hidden transition-all duration-500 ease-out
          ${showExplanation ? "max-h-[500px] opacity-100 p-4 animate-slide-up" : "max-h-0 opacity-0 p-0 border-0"}
        `}
      >
        {/* Result header */}
        <div className="flex items-center gap-2 mb-3">
          {isCorrect ? (
            <>
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <span className="text-sm font-bold text-green-400">Верно!</span>
              <span className="text-xs text-text-muted ml-auto font-mono">
                {formatTime(elapsedMs)}
              </span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <span className="text-sm font-bold text-red-400">Неверно</span>
              <span className="text-xs text-text-muted ml-auto font-mono">
                {formatTime(elapsedMs)}
              </span>
            </>
          )}
        </div>

        {/* Explanation text */}
        <p className="text-sm text-text-secondary leading-relaxed mb-3">
          {data.explanation}
        </p>

        {/* Community stats */}
        {communityStats && communityStats.totalAnswers > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
            <svg
              className="w-4 h-4 text-text-muted flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            <span className="text-xs text-text-muted">
              {communityStats.correctPercent}% игроков ответили правильно
            </span>
          </div>
        )}

        {/* Swipe hint */}
        <div className="flex justify-center mt-4">
          <div className="flex flex-col items-center gap-1 text-text-muted animate-bounce">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 15.75l7.5-7.5 7.5 7.5"
              />
            </svg>
            <span className="text-[10px] uppercase tracking-widest">
              Свайпни вверх
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
