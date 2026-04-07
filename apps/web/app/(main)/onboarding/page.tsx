"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
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
  {
    title: "Готов начать?",
    description:
      "Ежедневная разминка, баттлы с ботом или реальными соперниками, модули обучения — всё для прокачки разума.",
    icon: (
      <svg className="w-16 h-16 text-accent" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 56V36l-8 8V28l20-20 20 20v16l-8-8v20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 56V44h8v12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const step = steps[currentStep] as OnboardingStep;
  const isLast = currentStep === steps.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      localStorage.setItem("razum_onboarding_done", "true");
      router.push("/");
      return;
    }
    setCurrentStep((s) => s + 1);
  }, [isLast, router]);

  const goBack = useCallback(() => {
    if (currentStep === 0) return;
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const skip = useCallback(() => {
    localStorage.setItem("razum_onboarding_done", "true");
    router.push("/");
  }, [router]);

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
            {step.icon}
          </div>
        </div>

        {/* Text */}
        <div
          key={`text-${currentStep}`}
          className="space-y-4 max-w-xs animate-[onboarding-fade-in_0.4s_ease-out_0.1s_both]"
        >
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">
            {step.title}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {steps.map((_, i) => (
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
          {isLast ? "Начать" : "Далее"}
        </Button>
        {currentStep > 0 && (
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
