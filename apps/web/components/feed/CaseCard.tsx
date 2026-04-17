"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getBranch } from "@/lib/branches";
import { BranchBadge } from "@/components/ui/BranchBadge";
import { FeedCardShell } from "@/components/ui/FeedCardShell";
import { SwipeHint } from "@/components/ui/SwipeHint";

interface CaseCardProps {
  data: {
    scenario: string;
    question: string;
    options: string[];
    bestOptionIndex: number;
    analysis: string;
    realExample?: string;
  };
  branch: string;
  onAnswer?: (correct: boolean, answerIndex: number) => void;
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
      />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" opacity={0.3}>
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
    </svg>
  );
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function CaseCard({ data, branch, onAnswer }: CaseCardProps) {
  const { scenario, question, options, bestOptionIndex, analysis, realExample } = data;

  const meta = getBranch(branch);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const answered = selectedIndex !== null;

  const analysisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!answered) return;
    const timer = setTimeout(() => setShowAnalysis(true), 400);
    return () => clearTimeout(timer);
  }, [answered]);

  useEffect(() => {
    if (showAnalysis && analysisRef.current) {
      analysisRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showAnalysis]);

  const handleSelect = useCallback(
    (index: number) => {
      if (answered) return;
      setSelectedIndex(index);
      const isCorrect = index === bestOptionIndex;
      onAnswer?.(isCorrect, index);
    },
    [answered, bestOptionIndex, onAnswer],
  );

  const scenarioParagraphs = scenario
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (scenarioParagraphs.length === 0) scenarioParagraphs.push(scenario);

  return (
    <FeedCardShell branch={meta} glow="top-corner" fullscreen>
      <div className="relative z-10 flex flex-col flex-1 px-5 py-6 overflow-y-auto scrollbar-thin space-y-5">

        <div className="flex items-center gap-2.5">
          <BranchBadge
            branch={meta}
            label="КЕЙС"
            icon={<BriefcaseIcon className="w-3.5 h-3.5" />}
            bgAlpha="12"
            borderAlpha="44"
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        <div
          className="relative rounded-xl px-4 py-4 space-y-2.5"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            borderLeft: `3px solid ${meta.color}`,
          }}
        >
          <div
            className="pointer-events-none absolute -left-px -top-px h-20 w-20 rounded-tl-xl opacity-15 blur-2xl"
            style={{ backgroundColor: meta.color }}
          />

          {scenarioParagraphs.map((part, i) => (
            <p
              key={i}
              className={`text-sm leading-[1.7] ${
                i === 0
                  ? "italic text-text-primary/85"
                  : "text-text-secondary"
              }`}
            >
              {part}
            </p>
          ))}
        </div>

        <p className="text-base font-bold leading-snug text-text-primary text-center">
          {question}
        </p>

        <div className="space-y-3">
          {options.map((text, idx) => {
            const isBest = idx === bestOptionIndex;
            const isSelected = idx === selectedIndex;

            let cardBorder = `1px solid rgba(255,255,255,0.07)`;
            let cardBg = "rgba(17,17,20,0.7)";
            let cardShadow = "none";
            let letterBorder = "rgba(255,255,255,0.15)";
            let letterBg = "transparent";
            let letterColor = "rgba(255,255,255,0.5)";
            let textColor = "text-text-primary";
            let extraClass = "";
            let icon: React.ReactNode = (
              <span className="text-xs font-bold" style={{ color: letterColor }}>
                {OPTION_LETTERS[idx]}
              </span>
            );

            if (answered) {
              if (isBest) {
                cardBorder = "1px solid rgba(234,179,8,0.5)";
                cardBg = "rgba(234,179,8,0.08)";
                cardShadow = "0 0 24px rgba(234,179,8,0.12), 0 0 48px rgba(234,179,8,0.04)";
                letterBorder = "rgba(234,179,8,0.6)";
                letterBg = "rgba(234,179,8,0.2)";
                letterColor = "#EAB308";
                icon = <CheckIcon className="w-3.5 h-3.5 text-yellow-400" />;
              } else if (isSelected && !isBest) {
                cardBorder = "1px solid rgba(239,68,68,0.4)";
                cardBg = "rgba(239,68,68,0.06)";
                letterBorder = "rgba(239,68,68,0.5)";
                letterBg = "rgba(239,68,68,0.15)";
                letterColor = "#EF4444";
                textColor = "text-red-300/80";
                icon = <XMarkIcon className="w-3.5 h-3.5 text-red-400" />;
              } else {
                cardBg = "rgba(17,17,20,0.4)";
                cardBorder = "1px solid rgba(255,255,255,0.03)";
                extraClass = "opacity-40";
                textColor = "text-text-muted";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={answered}
                className={`
                  w-full text-left rounded-xl px-4 py-4 transition-all duration-300
                  ${!answered ? "active:scale-[0.98] hover:scale-[1.01]" : ""}
                  ${extraClass}
                `}
                style={{
                  border: cardBorder,
                  backgroundColor: cardBg,
                  boxShadow: cardShadow,
                }}
                onMouseEnter={(e) => {
                  if (!answered) {
                    e.currentTarget.style.borderColor = `${meta.color}55`;
                    e.currentTarget.style.boxShadow = `0 0 16px ${meta.color}18`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!answered) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                    style={{
                      borderColor: letterBorder,
                      backgroundColor: letterBg,
                    }}
                  >
                    {icon}
                  </span>

                  <span className={`text-sm leading-snug flex-1 ${textColor}`}>
                    {text}
                  </span>

                  {answered && isBest && (
                    <span className="ml-auto flex items-center gap-1 text-yellow-400 text-xs font-semibold whitespace-nowrap flex-shrink-0">
                      <StarIcon className="w-3.5 h-3.5" />
                      Лучший выбор
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {showAnalysis && (
          <div
            ref={analysisRef}
            className="space-y-4 pt-5 border-t border-white/[0.06] animate-slide-up"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-px flex-1 opacity-30"
                style={{ backgroundColor: meta.color }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ color: meta.color }}
              >
                РАЗБОР
              </span>
              <div
                className="h-px flex-1 opacity-30"
                style={{ backgroundColor: meta.color }}
              />
            </div>

            <p className="text-sm text-text-secondary leading-[1.7]">
              {analysis}
            </p>

            {realExample && (
              <div
                className="relative rounded-xl px-5 py-4 overflow-hidden"
                style={{
                  backgroundColor: `${meta.color}08`,
                  borderLeft: `3px solid ${meta.color}50`,
                }}
              >
                <div className="absolute top-2 right-3">
                  <QuoteIcon className="w-8 h-8 text-white" />
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2 text-text-muted">
                  Из реальной жизни
                </p>
                <p className="text-sm text-text-primary/90 leading-[1.65] italic">
                  &ldquo;{realExample}&rdquo;
                </p>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <span
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border"
                style={{
                  color: "#EAB308",
                  borderColor: "rgba(234,179,8,0.3)",
                  backgroundColor: "rgba(234,179,8,0.08)",
                }}
              >
                <StarIcon className="w-3.5 h-3.5" />
                +20 XP {meta.label}
              </span>
            </div>

            <SwipeHint className="pt-2" />
          </div>
        )}
      </div>
    </FeedCardShell>
  );
}
