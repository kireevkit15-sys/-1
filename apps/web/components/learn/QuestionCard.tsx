"use client";

import { useState, useCallback } from "react";
import Card from "@/components/ui/Card";

interface QuestionOption {
  text: string;
  index: number;
}

interface QuestionCardProps {
  question: string;
  options: QuestionOption[];
  correctIndex: number;
  explanation?: string;
  onAnswer?: (isCorrect: boolean) => void;
}

export default function QuestionCard({
  question,
  options,
  correctIndex,
  explanation,
  onAnswer,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === correctIndex;

  const handleSelect = useCallback(
    (index: number) => {
      if (answered) return;
      setSelected(index);
      onAnswer?.(index === correctIndex);
    },
    [answered, correctIndex, onAnswer],
  );

  return (
    <Card padding="lg" className="space-y-4">
      {/* Question text */}
      <p className="text-sm font-medium text-text-primary leading-relaxed">
        {question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const isThis = selected === opt.index;
          const isRight = opt.index === correctIndex;

          let style = "border-border bg-surface hover:border-accent/30";
          if (answered) {
            if (isRight) {
              style = "border-green-500/50 bg-green-500/10";
            } else if (isThis && !isCorrect) {
              style = "border-accent-red/50 bg-accent-red/10";
            } else {
              style = "border-border bg-surface opacity-50";
            }
          }

          return (
            <button
              key={opt.index}
              onClick={() => handleSelect(opt.index)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} ${
                !answered ? "active:scale-[0.98]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    answered && isRight
                      ? "border-green-500 text-green-500 bg-green-500/20"
                      : answered && isThis && !isCorrect
                        ? "border-accent-red text-accent-red bg-accent-red/20"
                        : "border-text-muted text-text-muted"
                  }`}
                >
                  {answered && isRight ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : answered && isThis && !isCorrect ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    String.fromCharCode(65 + opt.index)
                  )}
                </span>
                <span className="text-text-primary">{opt.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && explanation && (
        <div className="pt-3 border-t border-border animate-[onboarding-fade-in_0.3s_ease-out]">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1.5">
            Объяснение
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </Card>
  );
}
