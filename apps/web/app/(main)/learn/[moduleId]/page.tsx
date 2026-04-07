"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuestionCard from "@/components/learn/QuestionCard";
import AiChat from "@/components/learn/AiChat";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  branch: string;
  order: number;
  questions: Question[];
  progress: {
    completedQuestions: number;
    totalQuestions: number;
    isCompleted: boolean;
  };
}

// Fallback module for demo
const DEMO_MODULE: Module = {
  id: "demo",
  title: "Основы стратегии",
  description: "Введение в стратегическое мышление: базовые принципы, модели принятия решений и фреймворки анализа.",
  branch: "STRATEGY",
  order: 1,
  questions: [
    {
      id: "q1",
      text: "Какой принцип лежит в основе дилеммы заключённого?",
      options: [
        "Кооперация всегда выгоднее предательства",
        "Индивидуально рациональный выбор может привести к коллективно невыгодному исходу",
        "Первый ход всегда определяет исход игры",
        "Случайная стратегия — лучшая стратегия",
      ],
      correctIndex: 1,
      explanation: "Дилемма заключённого показывает, что когда каждый действует в своих интересах (предаёт), оба проигрывают больше, чем если бы кооперировались.",
      difficulty: "BRONZE",
    },
    {
      id: "q2",
      text: "Что такое 'стратегия доминирования' в теории игр?",
      options: [
        "Стратегия, которая побеждает все остальные при любых условиях",
        "Стратегия, которая доминирует на рынке",
        "Стратегия, основанная на подавлении соперника",
        "Стратегия первого хода",
      ],
      correctIndex: 0,
      explanation: "Доминирующая стратегия — это та, которая приносит лучший результат независимо от действий других игроков.",
      difficulty: "SILVER",
    },
    {
      id: "q3",
      text: "Какой из этих принципов НЕ относится к стратегическому мышлению?",
      options: [
        "Анализ альтернативных сценариев",
        "Учёт действий других участников",
        "Принятие решений исключительно на эмоциях",
        "Долгосрочное планирование",
      ],
      correctIndex: 2,
      explanation: "Стратегическое мышление основано на рациональном анализе, а не на эмоциональных реакциях.",
      difficulty: "BRONZE",
    },
    {
      id: "q4",
      text: "Равновесие Нэша — это ситуация, когда:",
      options: [
        "Один игрок доминирует над остальными",
        "Все игроки получают максимальный выигрыш",
        "Ни один игрок не может улучшить свой результат, изменив стратегию в одностороннем порядке",
        "Игра заканчивается вничью",
      ],
      correctIndex: 2,
      explanation: "В равновесии Нэша каждый игрок выбирает лучший ответ на стратегии других, и никто не имеет стимула отклоняться.",
      difficulty: "GOLD",
    },
    {
      id: "q5",
      text: "Метод SWOT-анализа помогает оценить:",
      options: [
        "Только внутренние ресурсы компании",
        "Только внешние угрозы",
        "Сильные и слабые стороны, возможности и угрозы",
        "Финансовые показатели за квартал",
      ],
      correctIndex: 2,
      explanation: "SWOT — Strengths, Weaknesses, Opportunities, Threats — охватывает как внутренние факторы (сильные/слабые стороны), так и внешние (возможности/угрозы).",
      difficulty: "BRONZE",
    },
  ],
  progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false },
};

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const token = useApiToken();
  const moduleId = params.moduleId as string;

  const [mod, setMod] = useState<Module | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModule() {
      try {
        const res = await fetch(`${API_BASE}/modules/${moduleId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setMod(data);
        } else {
          setMod(DEMO_MODULE);
        }
      } catch {
        setMod(DEMO_MODULE);
      }
      setLoading(false);
    }
    fetchModule();
  }, [moduleId, token]);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswered((prev) => new Set(prev).add(currentQ));
      if (isCorrect) setCorrectCount((c) => c + 1);

      // Submit progress to backend
      if (mod && mod.questions[currentQ]) {
        fetch(`${API_BASE}/modules/${mod.id}/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            questionId: mod.questions[currentQ]!.id,
          }),
        }).catch(() => {});
      }
    },
    [currentQ, mod, token],
  );

  const goNext = useCallback(() => {
    if (!mod) return;
    if (currentQ < mod.questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setShowComplete(true);
    }
  }, [currentQ, mod]);

  if (loading) {
    return (
      <div className="px-4 pt-12 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!mod) return null;

  // Completion screen
  if (showComplete) {
    const pct = Math.round((correctCount / mod.questions.length) * 100);
    return (
      <div className="px-4 pt-12 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-accent-gold rounded-full scale-150" />
          <div className="relative w-20 h-20 rounded-full bg-surface border border-accent-gold/20 flex items-center justify-center shadow-[0_0_40px_rgba(185,141,52,0.15)]">
            <svg className="w-10 h-10 text-accent-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Модуль пройден!
        </h1>
        <p className="text-text-secondary text-sm mb-6">
          {mod.title}
        </p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-accent-gold">{pct}%</p>
            <p className="text-xs text-text-muted mt-1">Верных</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-accent">
              {correctCount}/{mod.questions.length}
            </p>
            <p className="text-xs text-text-muted mt-1">Ответов</p>
          </Card>
        </div>

        <div className="space-y-3 w-full max-w-xs">
          <Button fullWidth onClick={() => router.push("/learn")}>
            К модулям
          </Button>
        </div>
      </div>
    );
  }

  const q = mod.questions[currentQ] as Question;

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/learn")}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-text-primary truncate mx-4">
          {mod.title}
        </h1>
        <span className="text-xs text-text-muted whitespace-nowrap">
          {currentQ + 1}/{mod.questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-warm to-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentQ + (answered.has(currentQ) ? 1 : 0)) / mod.questions.length) * 100}%` }}
        />
      </div>

      {/* Difficulty badge */}
      <div className="flex justify-end">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
            q.difficulty === "GOLD"
              ? "bg-accent-gold/20 text-accent-gold"
              : q.difficulty === "SILVER"
                ? "bg-accent-silver/20 text-accent-silver"
                : "bg-accent-bronze/20 text-accent-bronze"
          }`}
        >
          {q.difficulty === "GOLD" ? "Золото" : q.difficulty === "SILVER" ? "Серебро" : "Бронза"}
        </span>
      </div>

      {/* Question card */}
      <QuestionCard
        key={q.id}
        question={q.text}
        options={q.options.map((text, i) => ({ text, index: i }))}
        correctIndex={q.correctIndex}
        explanation={q.explanation}
        onAnswer={handleAnswer}
      />

      {/* Next button + Ask AI */}
      {answered.has(currentQ) && (
        <div className="space-y-2 animate-[onboarding-fade-in_0.3s_ease-out]">
          <Button fullWidth onClick={goNext}>
            {currentQ < mod.questions.length - 1 ? "Следующий вопрос" : "Завершить модуль"}
          </Button>
          <button
            onClick={() => setShowAiChat(true)}
            className="w-full py-2.5 text-sm text-accent hover:text-accent/80 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Спросить AI
          </button>
        </div>
      )}

      {/* AI Chat overlay */}
      {showAiChat && (
        <AiChat
          topic={mod.title}
          moduleId={mod.id}
          onClose={() => setShowAiChat(false)}
        />
      )}
    </div>
  );
}
