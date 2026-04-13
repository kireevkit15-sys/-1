"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ─── branch utilities ─── */
const BRANCH_COLORS: Record<string, { color: string; rgb: string }> = {
  STRATEGY:  { color: "#06B6D4", rgb: "6,182,212"   },
  LOGIC:     { color: "#22C55E", rgb: "34,197,94"   },
  ERUDITION: { color: "#A855F7", rgb: "168,85,247"  },
  RHETORIC:  { color: "#F97316", rgb: "249,115,22"  },
  INTUITION: { color: "#EC4899", rgb: "236,72,153"  },
};

const branchFor = (b?: string | null) =>
  BRANCH_COLORS[(b ?? "STRATEGY").toUpperCase()] ?? BRANCH_COLORS.STRATEGY;

/* ─── types ─── */
interface SparringCardProps {
  data: {
    questionId: string;
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    opponentName: string;
    opponentTimeMs: number;
    opponentCorrect: boolean;
  };
  branch: string;
  onAnswer?: (isCorrect: boolean, answerIndex: number, timeTakenMs: number) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

/* ─── component ─── */
export default function SparringCard({ data, branch, onAnswer }: SparringCardProps) {
  const bc = branchFor(branch);

  const [selected, setSelected] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const answered = selected !== null;
  const isCorrect = selected === data.correctIndex;
  const timeTakenMs = answered ? elapsedMs : 0;

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

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const ds = Math.floor((ms % 1000) / 100);
    return `${s}.${ds}`;
  };

  /* did the player win? */
  const playerWon = isCorrect && (!data.opponentCorrect || timeTakenMs < data.opponentTimeMs);
  const draw = isCorrect && data.opponentCorrect && Math.abs(timeTakenMs - data.opponentTimeMs) < 500;

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col px-4 py-6">
      {/* ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${bc.color} 0%, transparent 70%)`,
        }}
      />

      {/* ── Badge + timer ── */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border"
          style={{
            borderColor: `${bc.color}44`,
            backgroundColor: `${bc.color}12`,
            color: bc.color,
          }}
        >
          {/* crossed swords icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20L10.5 13.5" />
            <path d="M14.5 9.5L20 4" />
            <path d="M20 4L16 4L16 8" />
            <path d="M20 20L13.5 13.5" />
            <path d="M9.5 9.5L4 4" />
            <path d="M4 4L8 4L8 8" />
          </svg>
          СПАРРИНГ
        </span>

        {/* live timer */}
        <span
          className={`font-mono text-sm tabular-nums px-3 py-1.5 rounded-full bg-surface-light/80 border border-border ${!answered ? "animate-pulse" : ""}`}
          style={{ color: answered ? (isCorrect ? "#22C55E" : "#EF4444") : bc.color }}
        >
          {formatTime(elapsedMs)} сек
        </span>
      </div>

      {/* ── VS header ── */}
      <div className="relative z-10 flex items-center justify-between gap-4 py-4 mb-6">
        {/* dramatic split line */}
        <div
          className="absolute inset-x-0 top-1/2 h-px opacity-20"
          style={{ background: `linear-gradient(to right, transparent, ${bc.color}, transparent)` }}
        />

        {/* player */}
        <div className="relative z-10 flex flex-col items-center gap-2 flex-1">
          <div
            className="w-12 h-12 rounded-full border-2 bg-surface-light flex items-center justify-center"
            style={{ borderColor: `${bc.color}66` }}
          >
            <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-text-primary">Ты</span>
        </div>

        {/* VS */}
        <span
          className="relative z-10 text-2xl font-black tracking-wider"
          style={{
            color: bc.color,
            textShadow: `0 0 12px rgba(${bc.rgb}, 0.6), 0 0 30px rgba(${bc.rgb}, 0.3)`,
          }}
        >
          VS
        </span>

        {/* opponent */}
        <div className="relative z-10 flex flex-col items-center gap-2 flex-1">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/40 bg-surface-light flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-red-400/80">{data.opponentName}</span>
        </div>
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
                  e.currentTarget.style.borderColor = `${bc.color}55`;
                  e.currentTarget.style.boxShadow = `0 0 15px ${bc.color}20, 0 0 30px ${bc.color}08`;
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

      {/* ── Result side-by-side ── */}
      {showResult && (
        <div className="relative z-10 space-y-4 animate-[count-up_0.4s_ease-out]">
          {/* outcome banner */}
          <div
            className={`text-center py-3 rounded-xl font-black text-lg tracking-wide ${
              playerWon
                ? "bg-green-500/10 text-green-400 border border-green-500/30"
                : draw
                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {playerWon ? (
              <div className="flex flex-col items-center gap-1">
                <span>ПОБЕДА!</span>
                <span className="text-xs font-normal text-green-400/70">+25 XP</span>
              </div>
            ) : draw ? (
              <span>НИЧЬЯ!</span>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span>ПОРАЖЕНИЕ</span>
                <span className="text-xs font-normal text-red-400/60">В следующий раз!</span>
              </div>
            )}
          </div>

          {/* comparison grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* player result */}
            <div className={`rounded-xl p-3 text-center border ${isCorrect ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Ты</p>
              <p className={`text-lg font-bold font-mono ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                {formatTime(timeTakenMs)}с {isCorrect ? "\u2713" : "\u2717"}
              </p>
              <p className={`text-xs mt-0.5 ${isCorrect ? "text-green-400/70" : "text-red-400/70"}`}>
                {isCorrect ? "Верно" : "Неверно"}
              </p>
            </div>
            {/* opponent result */}
            <div className={`rounded-xl p-3 text-center border ${data.opponentCorrect ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">{data.opponentName}</p>
              <p className={`text-lg font-bold font-mono ${data.opponentCorrect ? "text-green-400" : "text-red-400"}`}>
                {formatTime(data.opponentTimeMs)}с {data.opponentCorrect ? "\u2713" : "\u2717"}
              </p>
              <p className={`text-xs mt-0.5 ${data.opponentCorrect ? "text-green-400/70" : "text-red-400/70"}`}>
                {data.opponentCorrect ? "Верно" : "Неверно"}
              </p>
            </div>
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
