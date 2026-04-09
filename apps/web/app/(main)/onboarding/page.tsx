"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

// ── Branch selection data ────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  description: string;
  cssClass: string;
  icon: React.ReactNode;
}

const BRANCHES: Branch[] = [
  {
    id: "strategy",
    name: "Стратегия",
    description: "Системное мышление, планирование, принятие решений",
    cssClass: "branch-strategy",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="16,4 20,12 28,13 22,19 24,27 16,23 8,27 10,19 4,13 12,12" />
        <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "logic",
    name: "Логика",
    description: "Дедукция, цепочки рассуждений, критический анализ",
    cssClass: "branch-logic",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="10" height="7" rx="1.5" />
        <rect x="18" y="8" width="10" height="7" rx="1.5" />
        <rect x="11" y="20" width="10" height="7" rx="1.5" />
        <line x1="9" y1="15" x2="16" y2="20" />
        <line x1="23" y1="15" x2="16" y2="20" />
      </svg>
    ),
  },
  {
    id: "erudition",
    name: "Эрудиция",
    description: "История, наука, культура — широкий кругозор",
    cssClass: "branch-erudition",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 26V8a2 2 0 012-2h10l8 8v12a2 2 0 01-2 2H8a2 2 0 01-2-2z" />
        <polyline points="16,6 16,14 24,14" />
        <line x1="10" y1="18" x2="22" y2="18" />
        <line x1="10" y1="22" x2="18" y2="22" />
      </svg>
    ),
  },
  {
    id: "rhetoric",
    name: "Риторика",
    description: "Убеждение, аргументация, ораторское искусство",
    cssClass: "branch-rhetoric",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h20v14H18l-4 4-2-4H6V8z" />
        <line x1="11" y1="13" x2="21" y2="13" />
        <line x1="11" y1="17" x2="17" y2="17" />
      </svg>
    ),
  },
  {
    id: "intuition",
    name: "Интуиция",
    description: "Паттерн-распознавание, быстрое мышление, инсайт",
    cssClass: "branch-intuition",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="15" r="6" />
        <circle cx="16" cy="15" r="2.5" fill="currentColor" opacity="0.5" />
        <line x1="16" y1="4" x2="16" y2="7" />
        <line x1="16" y1="23" x2="16" y2="26" />
        <line x1="5" y1="15" x2="8" y2="15" />
        <line x1="24" y1="15" x2="27" y2="15" />
        <line x1="8.5" y1="8.5" x2="10.6" y2="10.6" />
        <line x1="21.4" y1="19.4" x2="23.5" y2="21.5" />
        <line x1="23.5" y1="8.5" x2="21.4" y2="10.6" />
        <line x1="10.6" y1="19.4" x2="8.5" y2="21.5" />
      </svg>
    ),
  },
];

// ── Info steps (intro slides) ────────────────────────────────────────────────

interface InfoStep {
  kind: "info";
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface BranchStep {
  kind: "branches";
}

interface FinalStep {
  kind: "final";
}

type Step = InfoStep | BranchStep | FinalStep;

const INFO_STEPS: InfoStep[] = [
  {
    kind: "info",
    title: "Добро пожаловать в РАЗУМ",
    description:
      "Платформа интеллектуальных поединков. Прокачивай мышление, побеждай в баттлах, становись сильнее.",
    icon: (
      <svg className="w-16 h-16 text-accent" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="32" cy="32" r="28" strokeDasharray="4 4" />
        <path d="M32 18v14l10 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <circle cx="32" cy="32" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    kind: "info",
    title: "Интеллект-баттлы",
    description:
      "Сражайся 1 на 1 в 5 раундах. Выбирай категорию атаки, уровень сложности и отвечай на вопросы. Побеждает сильнейший разум.",
    icon: (
      <svg className="w-16 h-16 text-accent-gold" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M32 8l6 12 14 2-10 10 2 14-12-6-12 6 2-14-10-10 14-2z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    kind: "info",
    title: "Дерево знаний",
    description:
      "Два направления — Стратегия и Логика. Проходи модули, открывай новые темы, углубляй понимание.",
    icon: (
      <svg className="w-16 h-16 text-accent" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M32 56V32" strokeLinecap="round" />
        <path d="M32 32L18 18" strokeLinecap="round" />
        <path d="M32 32L46 18" strokeLinecap="round" />
        <path d="M18 18L10 10" strokeLinecap="round" />
        <path d="M18 18L22 8" strokeLinecap="round" />
        <path d="M46 18L42 8" strokeLinecap="round" />
        <path d="M46 18L54 10" strokeLinecap="round" />
        <circle cx="10" cy="10" r="4" fill="currentColor" />
        <circle cx="22" cy="8" r="4" fill="currentColor" />
        <circle cx="42" cy="8" r="4" fill="currentColor" />
        <circle cx="54" cy="10" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    kind: "info",
    title: "Твой аватар",
    description:
      "5 характеристик: Логика, Стратегия, Эрудиция, Риторика, Критическое мышление. Каждый баттл и модуль прокачивают тебя.",
    icon: (
      <svg className="w-16 h-16 text-accent-gold" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polygon points="32,4 40,24 60,24 44,38 50,58 32,46 14,58 20,38 4,24 24,24" strokeLinejoin="round" />
        <circle cx="32" cy="30" r="8" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
];

const STEPS: Step[] = [
  ...INFO_STEPS,
  { kind: "branches" },
  { kind: "final" },
];

// ── Branch selection step component ─────────────────────────────────────────

function BranchCard({
  branch,
  selected,
  onToggle,
}: {
  branch: Branch;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-full text-left rounded-2xl p-4 transition-all duration-200 ${branch.cssClass} branch-card`}
      style={
        selected
          ? {
              borderColor: `rgba(var(--branch-color), 0.6)`,
              boxShadow: `0 0 28px rgba(var(--branch-color), 0.2), 0 0 60px rgba(var(--branch-color), 0.06)`,
              background: `linear-gradient(135deg, rgba(var(--branch-color), 0.18) 0%, transparent 70%)`,
            }
          : undefined
      }
    >
      {/* Checkmark overlay */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[rgba(var(--branch-color),0.9)] flex items-center justify-center shadow-md">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="branch-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
          {branch.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-text-primary leading-tight">
            {branch.name}
          </p>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {branch.description}
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const router = useRouter();

  const step = STEPS[currentStep] ?? STEPS[0]!;
  const isLast = currentStep === STEPS.length - 1;

  const toggleBranch = useCallback((id: string) => {
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const canProceed =
    step.kind !== "branches" || selectedBranches.size === 3;

  const goNext = useCallback(() => {
    if (isLast) {
      localStorage.setItem("razum_onboarding_done", "true");
      if (selectedBranches.size > 0) {
        localStorage.setItem(
          "razum_favorite_branches",
          JSON.stringify([...selectedBranches]),
        );
      }
      router.push("/");
      return;
    }
    setCurrentStep((s) => s + 1);
  }, [isLast, router, selectedBranches]);

  const goBack = useCallback(() => {
    if (currentStep === 0) return;
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const skip = useCallback(() => {
    localStorage.setItem("razum_onboarding_done", "true");
    router.push("/");
  }, [router]);

  // ── Render branch step ─────────────────────────────────────────────────────
  if (step.kind === "branches") {
    return (
      <div className="px-4 pt-12 pb-24 min-h-screen flex flex-col">
        {/* Skip */}
        <div className="flex justify-end mb-6">
          <button
            onClick={skip}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Пропустить
          </button>
        </div>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-text-primary">Выбери 3 направления</h1>
          <p className="text-text-muted text-sm mt-1">
            Мы настроим первые баттлы под твои интересы
          </p>
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i < selectedBranches.size ? "bg-accent scale-110" : "bg-surface-light"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-text-muted tabular-nums">
            Выбрано: {selectedBranches.size}/3
          </span>
        </div>

        {/* Branch cards */}
        <div className="flex-1 space-y-2.5 overflow-y-auto">
          {BRANCHES.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              selected={selectedBranches.has(branch.id)}
              onToggle={() => toggleBranch(branch.id)}
            />
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-6 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-8 bg-accent"
                  : i < currentStep
                    ? "w-1.5 bg-accent/40"
                    : "w-1.5 bg-surface-light"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            fullWidth
            onClick={goNext}
            disabled={!canProceed}
          >
            {canProceed ? "Далее" : `Выбери ещё ${3 - selectedBranches.size}`}
          </Button>
          <button
            onClick={goBack}
            className="w-full py-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  // ── Render final step ──────────────────────────────────────────────────────
  if (step.kind === "final") {
    return (
      <div className="px-4 pt-12 pb-24 min-h-screen flex flex-col">
        <div className="flex justify-end mb-8">
          <button
            onClick={skip}
            className="text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            Пропустить
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Icon with glow */}
          <div className="mb-8 relative animate-[onboarding-fade-in_0.4s_ease-out]">
            <div className="absolute inset-0 blur-3xl opacity-20 bg-accent rounded-full scale-150" />
            <div className="relative w-28 h-28 rounded-full bg-surface border border-accent/20 flex items-center justify-center shadow-[0_0_40px_rgba(207,157,123,0.15)]">
              <svg className="w-16 h-16 text-accent" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 56V36l-8 8V28l20-20 20 20v16l-8-8v20" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M28 56V44h8v12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="space-y-4 max-w-xs animate-[onboarding-fade-in_0.4s_ease-out_0.1s_both]">
            <h1 className="text-2xl font-bold text-text-primary tracking-wide">
              Всё готово
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              Ежедневная разминка, баттлы с ботом или реальными соперниками, модули
              обучения — всё для прокачки разума.
            </p>

            {/* Selected branches preview */}
            {selectedBranches.size > 0 && (
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {BRANCHES.filter((b) => selectedBranches.has(b.id)).map((b) => (
                  <span
                    key={b.id}
                    className={`${b.cssClass} branch-badge`}
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-8 bg-accent"
                  : i < currentStep
                    ? "w-1.5 bg-accent/40"
                    : "w-1.5 bg-surface-light"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button fullWidth onClick={() => {
            localStorage.setItem("razum_onboarding_done", "true");
            if (selectedBranches.size > 0) {
              localStorage.setItem(
                "razum_favorite_branches",
                JSON.stringify([...selectedBranches]),
              );
            }
            router.push("/battle/new?bot=true");
          }}>
            Начать первый баттл
          </Button>
          <button
            onClick={() => {
              localStorage.setItem("razum_onboarding_done", "true");
              router.push("/");
            }}
            className="w-full py-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  // ── Render info step ───────────────────────────────────────────────────────
  const infoStep = step as InfoStep;
  const isFirstStep = currentStep === 0;

  return (
    <div className="px-4 pt-12 pb-24 min-h-screen flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end mb-8">
        <button
          onClick={skip}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors"
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Icon with glow */}
        <div
          key={`icon-${currentStep}`}
          className="mb-8 relative animate-[onboarding-fade-in_0.4s_ease-out]"
        >
          <div className="absolute inset-0 blur-3xl opacity-20 bg-accent rounded-full scale-150" />
          <div className="relative w-28 h-28 rounded-full bg-surface border border-accent/20 flex items-center justify-center shadow-[0_0_40px_rgba(207,157,123,0.15)]">
            {infoStep.icon}
          </div>
        </div>

        {/* Text */}
        <div
          key={`text-${currentStep}`}
          className="space-y-4 max-w-xs animate-[onboarding-fade-in_0.4s_ease-out_0.1s_both]"
        >
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">
            {infoStep.title}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {infoStep.description}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentStep
                ? "w-8 bg-accent"
                : i < currentStep
                  ? "w-1.5 bg-accent/40"
                  : "w-1.5 bg-surface-light"
            }`}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button fullWidth onClick={goNext}>
          Далее
        </Button>
        {!isFirstStep && (
          <button
            onClick={goBack}
            className="w-full py-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Назад
          </button>
        )}
      </div>
    </div>
  );
}
