"use client";

/**
 * F24.8 — Прогресс барьер-испытания.
 * 5 шагов: Вспомни → Свяжи → Примени → Защити → Вердикт.
 */

export type BarrierStep = "recall" | "connect" | "apply" | "defend" | "verdict";

export interface BarrierProgressProps {
  currentStep: BarrierStep;
  /** Шаги, которые уже пройдены (для cold-blood отображения). */
  completedSteps?: BarrierStep[];
}

interface StepDef {
  key: BarrierStep;
  label: string;
}

const STEPS: readonly StepDef[] = [
  { key: "recall", label: "Вспомни" },
  { key: "connect", label: "Свяжи" },
  { key: "apply", label: "Примени" },
  { key: "defend", label: "Защити" },
  { key: "verdict", label: "Вердикт" },
];

type StepState = "passed" | "current" | "future";

function resolveState(
  step: BarrierStep,
  currentStep: BarrierStep,
  completedSteps: readonly BarrierStep[],
): StepState {
  if (step === currentStep) return "current";
  if (completedSteps.includes(step)) return "passed";
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const thisIndex = STEPS.findIndex((s) => s.key === step);
  if (currentIndex >= 0 && thisIndex >= 0 && thisIndex < currentIndex) {
    return "passed";
  }
  return "future";
}

export default function BarrierProgress({
  currentStep,
  completedSteps = [],
}: BarrierProgressProps) {
  return (
    <div className="w-full max-w-[60ch] mx-auto px-2 sm:px-0">
      <ol className="flex items-start justify-between gap-1 sm:gap-2 relative">
        {STEPS.map((step, i) => {
          const state = resolveState(step.key, currentStep, completedSteps);
          const isLast = i === STEPS.length - 1;

          return (
            <li
              key={step.key}
              className="relative flex-1 flex flex-col items-center min-w-0"
            >
              {/* Линия-соединитель к следующему шагу */}
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute top-[6px] sm:top-[9px] left-1/2 w-full h-px transition-colors duration-500 ${
                    state === "passed"
                      ? "bg-cold-blood/60"
                      : "bg-border/60"
                  }`}
                />
              )}

              {/* Кружок */}
              <span
                aria-hidden
                className={`relative z-10 rounded-full border transition-all duration-500 ${
                  state === "current"
                    ? "w-4 h-4 sm:w-[18px] sm:h-[18px] bg-cold-blood border-cold-blood animate-blood-pulse shadow-[0_0_20px_rgba(139,46,46,0.5)]"
                    : state === "passed"
                      ? "w-3 h-3 sm:w-[14px] sm:h-[14px] bg-cold-blood border-cold-blood opacity-100"
                      : "w-3 h-3 sm:w-[14px] sm:h-[14px] bg-transparent border-border opacity-40"
                }`}
              />

              {/* Подпись */}
              <span
                className={`mt-3 font-ritual text-[10px] tracking-[0.3em] uppercase text-center leading-none transition-colors duration-500 ${
                  state === "current"
                    ? "text-cold-blood"
                    : state === "passed"
                      ? "text-text-secondary"
                      : "text-text-muted/50"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
