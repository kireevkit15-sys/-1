"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { playCorrect, playWrong, playTimerWarning } from "@/lib/sounds";
import { useApiToken } from "@/hooks/useApiToken";
import { API_BASE } from "@/lib/api/base";

// ---------------------------------------------------------------------------
// Motivational messages by score
// ---------------------------------------------------------------------------

function getMotivation(correct: number, total: number): { text: string; icon: React.ReactNode } {
  const score = correct;
  const max = total;

  const StarIcon = (
    <svg className="w-6 h-6 text-accent-gold" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
  const ThumbsIcon = (
    <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11z" />
    </svg>
  );
  const MuscleIcon = (
    <svg className="w-6 h-6 text-accent-warm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
  const FireIcon = (
    <svg className="w-6 h-6 text-accent-red" viewBox="0 0 14 18" fill="currentColor">
      <path d="M7 0C7 0 10 4 10 4C12 6 14 8 14 11C14 15 11 18 7 18C3 18 0 15 0 11C0 8 2 6 4 4C4 4 4 7 5.5 8C5.5 8 7 0 7 0Z" />
    </svg>
  );

  if (score === max) return { text: "Превосходно! Идеальный результат!", icon: StarIcon };
  if (score === max - 1) return { text: "Отличная работа! Почти идеально!", icon: ThumbsIcon };
  if (score === max - 2) return { text: "Хорошо! Есть куда расти.", icon: MuscleIcon };
  return { text: "Не сдавайся! Практика делает мастера.", icon: FireIcon };
}

// ---------------------------------------------------------------------------
// Floating XP animation
// ---------------------------------------------------------------------------

function FloatingXP({ xp }: { xp: number }) {
  return (
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ animation: "floatUp 1.4s ease-out forwards" }}
    >
      <span className="text-accent-gold font-black text-lg drop-shadow-[0_0_8px_rgba(185,141,52,0.8)]">
        +{xp} XP
      </span>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateX(-50%) translateY(0);   opacity: 1; }
          100% { transform: translateX(-50%) translateY(-48px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

interface WarmupQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const DEMO_QUESTIONS: WarmupQuestion[] = [
  {
    id: "w1",
    text: "Если все розы — цветы, и некоторые цветы быстро вянут, то можно ли утверждать, что некоторые розы быстро вянут?",
    options: ["Да, это логически следует", "Нет, это логическая ошибка", "Зависит от контекста", "Недостаточно информации"],
    correctIndex: 1,
    explanation: "Из того, что все розы — цветы, и некоторые цветы быстро вянут, нельзя заключить, что это именно розы. Это классическая ошибка нераспределённого среднего термина.",
  },
  {
    id: "w2",
    text: "Компания может вложить 1 млн в проект A (гарантированная прибыль 100к) или проект B (50% шанс прибыли 300к, 50% шанс убытка 50к). Какой выбор рационален с точки зрения ожидаемой ценности?",
    options: ["Проект A — он безопаснее", "Проект B — ожидаемая ценность выше", "Оба равноценны", "Нужна дополнительная информация"],
    correctIndex: 1,
    explanation: "Ожидаемая ценность B = 0.5 * 300к + 0.5 * (-50к) = 125к, что выше гарантированных 100к проекта A.",
  },
  {
    id: "w3",
    text: "Какой когнитивный искажённый приём описан: 'Мы уже вложили 2 млн в этот проект, нельзя останавливаться'?",
    options: ["Эффект якоря", "Ошибка невозвратных затрат", "Предвзятость подтверждения", "Эффект ореола"],
    correctIndex: 1,
    explanation: "Ошибка невозвратных затрат (sunk cost fallacy) — когда прошлые инвестиции влияют на решение продолжать, хотя рационально нужно оценивать только будущие перспективы.",
  },
  {
    id: "w4",
    text: "В переговорах стратегия BATNA означает:",
    options: ["Лучшая цена для обеих сторон", "Лучшая альтернатива обсуждаемому соглашению", "Базовая тактика нападения", "Баланс технических аргументов"],
    correctIndex: 1,
    explanation: "BATNA — Best Alternative To a Negotiated Agreement. Это ваш план Б, который определяет минимально приемлемые условия сделки.",
  },
  {
    id: "w5",
    text: "Какой принцип описывает ситуацию, когда добавление нового элемента в систему делает её непропорционально сложнее?",
    options: ["Закон Мура", "Закон убывающей отдачи", "Комбинаторный взрыв", "Принцип Парето"],
    correctIndex: 2,
    explanation: "Комбинаторный взрыв — рост числа возможных комбинаций при добавлении элементов. Например, 10 элементов = 1024 комбинации, 20 = более миллиона.",
  },
];

type Phase = "loading" | "question" | "result";

export default function WarmupPage() {
  const router = useRouter();
  const token = useApiToken();
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<WarmupQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);
  const [showXpAnim, setShowXpAnim] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch warmup questions + streak
  useEffect(() => {
    async function fetchWarmup() {
      try {
        const [warmupRes, userRes] = await Promise.all([
          fetch(`${API_BASE}/warmup/today`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          token
            ? fetch(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
            : Promise.resolve(null),
        ]);

        if (userRes?.ok) {
          const userData = await userRes.json();
          setStreak(userData.streak ?? null);
        }

        if (warmupRes.ok) {
          const data = await warmupRes.json();
          setQuestions(data.questions || data);
          setPhase("question");
        } else if (warmupRes.status === 409) {
          setAlreadyDone(true);
          setPhase("result");
        } else {
          setQuestions(DEMO_QUESTIONS);
          setPhase("question");
        }
      } catch {
        setQuestions(DEMO_QUESTIONS);
        setPhase("question");
      }
    }
    fetchWarmup();
  }, [token]);

  // Timer
  useEffect(() => {
    if (phase !== "question" || selected !== null) return;

    setTimeLeft(30);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Time's up — auto-skip
          clearInterval(timerRef.current!);
          handleAnswer(-1);
          return 0;
        }
        if (t === 11) playTimerWarning();
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQ, selected]);

  const handleAnswer = useCallback(
    (index: number) => {
      if (selected !== null) return;
      if (timerRef.current) clearInterval(timerRef.current);
      setSelected(index);
      const isCorrect = index === questions[currentQ]?.correctIndex;
      if (isCorrect) playCorrect(); else playWrong();
      setAnswers((prev) => [...prev, isCorrect]);
      setSelectedIndexes((prev) => [...prev, index]);
    },
    [selected, questions, currentQ],
  );

  const goNext = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
    } else {
      setPhase("result");
      setShowXpAnim(true);
      setTimeout(() => setShowXpAnim(false), 1600);
      // Submit results
      fetch(`${API_BASE}/warmup/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answers: selectedIndexes.map((sel, i) => ({ questionId: questions[i]?.id, selectedIndex: sel })) }),
      }).catch(() => {});
    }
  }, [currentQ, questions, answers, selected, selectedIndexes, token]);

  // Loading
  if (phase === "loading") {
    return (
      <div className="px-4 pt-12 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Result
  if (phase === "result") {
    const correctCount = answers.filter(Boolean).length;
    const total = questions.length || 5;
    const xpEarned = correctCount * 20;
    const newStreak = streak !== null ? streak + 1 : null;

    if (alreadyDone) {
      return (
        <div className="px-4 pt-12 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
          {/* Streak badge */}
          {newStreak !== null && (
            <div className="flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/20 rounded-full px-4 py-2 mb-6">
              <svg className="w-5 h-5 text-accent-gold" viewBox="0 0 14 18" fill="currentColor">
                <path d="M7 0C7 0 10 4 10 4C12 6 14 8 14 11C14 15 11 18 7 18C3 18 0 15 0 11C0 8 2 6 4 4C4 4 4 7 5.5 8C5.5 8 7 0 7 0Z" />
              </svg>
              <span className="text-accent-gold font-bold text-sm">{newStreak} дней подряд</span>
            </div>
          )}
          <div className="w-16 h-16 rounded-full bg-accent-gold/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-accent-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">
            Разминка уже пройдена
          </h1>
          <p className="text-text-secondary text-sm mb-6">
            Возвращайся завтра за новыми вопросами
          </p>
          <Button onClick={() => router.push("/")}>На главную</Button>
        </div>
      );
    }

    const motivation = getMotivation(correctCount, total);

    return (
      <div className="px-4 pt-12 pb-24 flex flex-col items-center justify-center min-h-[60vh] text-center">

        {/* Streak counter — prominent at top */}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-accent-warm/20 to-accent-gold/10 border border-accent-gold/25 rounded-2xl px-5 py-3 mb-6 shadow-[0_0_20px_rgba(185,141,52,0.12)]">
          <svg
            className="w-7 h-7 text-accent-gold drop-shadow-[0_0_8px_rgba(185,141,52,0.7)]"
            viewBox="0 0 14 18"
            fill="currentColor"
          >
            <path d="M7 0C7 0 10 4 10 4C12 6 14 8 14 11C14 15 11 18 7 18C3 18 0 15 0 11C0 8 2 6 4 4C4 4 4 7 5.5 8C5.5 8 7 0 7 0Z" />
          </svg>
          <div className="text-left">
            <p className="text-accent-gold font-black text-2xl leading-none">
              {newStreak !== null ? newStreak : "—"}
            </p>
            <p className="text-accent-gold/70 text-xs font-medium">дней подряд</p>
          </div>
        </div>

        {/* Score circle */}
        <div className="relative mb-4">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-accent-gold rounded-full scale-150" />
          <div className="relative w-20 h-20 rounded-full bg-surface border border-accent-gold/20 flex items-center justify-center shadow-[0_0_40px_rgba(185,141,52,0.15)]">
            <span className="text-3xl font-bold text-accent-gold">
              {correctCount}
            </span>
          </div>
          {/* Floating XP animation */}
          {showXpAnim && <FloatingXP xp={xpEarned} />}
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Разминка завершена!
        </h1>
        <p className="text-text-secondary text-sm mb-5">
          {correctCount}/{total} правильных ответов
        </p>

        {/* Motivational message */}
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 mb-6 w-full max-w-xs">
          <div className="shrink-0">{motivation.icon}</div>
          <p className="text-sm font-semibold text-text-primary text-left">{motivation.text}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-accent">
              +{xpEarned}
            </p>
            <p className="text-xs text-text-muted mt-1">XP</p>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-1">
              <svg className="w-5 h-5 text-accent-gold" viewBox="0 0 14 18" fill="currentColor">
                <path d="M7 0C7 0 10 4 10 4C12 6 14 8 14 11C14 15 11 18 7 18C3 18 0 15 0 11C0 8 2 6 4 4C4 4 4 7 5.5 8C5.5 8 7 0 7 0Z" />
              </svg>
              <p className="text-2xl font-bold text-accent-gold">+1</p>
            </div>
            <p className="text-xs text-text-muted mt-1">Стрик</p>
          </Card>
        </div>

        {/* Continue streak hint */}
        <p className="text-text-muted text-xs mb-6">
          Продолжить стрик завтра
        </p>

        <div className="space-y-3 w-full max-w-xs">
          <Button fullWidth onClick={() => router.push("/")}>
            На главную
          </Button>
        </div>
      </div>
    );
  }

  // Question phase
  const q = questions[currentQ] as WarmupQuestion;
  const answered = selected !== null;

  return (
    <div className="px-4 pt-12 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-text-primary">
          Ежедневная разминка
        </h1>
        <span className="text-xs text-text-muted">
          {currentQ + 1}/{questions.length}
        </span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-warm to-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentQ + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Timer */}
      <div className="flex justify-end">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            timeLeft <= 10 && !answered
              ? "bg-accent-red/20 text-accent-red"
              : "bg-surface-light text-text-muted"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 6v6l4 2" />
          </svg>
          {answered ? "---" : `${timeLeft}s`}
        </div>
      </div>

      {/* Question */}
      <Card padding="lg">
        <p className="text-sm font-medium text-text-primary leading-relaxed">
          {q.text}
        </p>
      </Card>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isThis = selected === i;
          const isRight = i === q.correctIndex;

          let style = "border-border bg-surface hover:border-accent/30";
          if (answered) {
            if (isRight) style = "border-green-500/50 bg-green-500/10";
            else if (isThis) style = "border-accent-red/50 bg-accent-red/10";
            else style = "border-border bg-surface opacity-50";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${style} ${!answered ? "active:scale-[0.98]" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    answered && isRight
                      ? "border-green-500 text-green-500 bg-green-500/20"
                      : answered && isThis
                        ? "border-accent-red text-accent-red bg-accent-red/20"
                        : "border-text-muted text-text-muted"
                  }`}
                >
                  {answered && isRight ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : answered && isThis ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="text-text-primary">{opt}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation + Next */}
      {answered && (
        <div className="space-y-3 animate-[onboarding-fade-in_0.3s_ease-out]">
          <Card padding="md" className="border-l-2 border-l-accent/30">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1">
              Объяснение
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {q.explanation}
            </p>
          </Card>
          <Button fullWidth onClick={goNext}>
            {currentQ < questions.length - 1 ? "Следующий" : "Результат"}
          </Button>
        </div>
      )}
    </div>
  );
}
