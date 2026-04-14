"use client";

/**
 * F22.1 — Экран урока дня
 * Вертикальная лента карточек со свайпом вверх (scroll-snap). Фиксированный
 * заголовок: название темы дня + прогресс «N/M». Прогресс обновляется по
 * IntersectionObserver: активная карточка = та, что занимает центр экрана.
 *
 * Пока бэкенд path-builder (L22.2) не готов — страница работает в демо-режиме
 * с примером дневной ленты, чтобы можно было проверить UI и интеграцию всех
 * карточек F22.2–F22.9.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HookCard } from "@/components/learning/HookCard";
import { ExplanationCard } from "@/components/learning/ExplanationCard";
import { EvidenceCard } from "@/components/learning/EvidenceCard";
import { ExampleCard } from "@/components/learning/ExampleCard";
import { QuizCard } from "@/components/learning/QuizCard";
import { ExplainCard, type ExplainResult } from "@/components/learning/ExplainCard";
import { ThreadCard } from "@/components/learning/ThreadCard";
import { WisdomLearningCard } from "@/components/learning/WisdomLearningCard";

type CardKind =
  | "hook"
  | "explanation"
  | "evidence"
  | "example"
  | "quiz"
  | "explain"
  | "thread"
  | "wisdom";

interface LessonCard {
  id: string;
  kind: CardKind;
  // Данные для каждого типа — в демо задаём литералами.
  data: unknown;
}

interface Lesson {
  dayIndex: number;
  topicTitle: string;
  cards: LessonCard[];
}

// Демо-урок — 8 карточек, по одной каждого типа.
const DEMO_LESSON: Lesson = {
  dayIndex: 14,
  topicTitle: "Решение без полной информации",
  cards: [
    {
      id: "hook",
      kind: "hook",
      data: {
        text: "Ты никогда не узнаешь всего. Но решение нужно принять сейчас.",
      },
    },
    {
      id: "explanation",
      kind: "explanation",
      data: {
        title: "Почему полной картины не бывает",
        body:
          "Любое решение принимается в условиях неполноты. Часть фактов скрыта, часть — ещё не случилась, часть — искажена теми, кто их передаёт. Ждать полноты — значит не решать никогда.\n\nСтратег не ищет полной картины. Он ищет минимум, достаточный для движения. Минимум — это тот набор фактов, без которого решение становится случайным. Всё сверх него — роскошь, которая чаще всего превращается в повод для промедления.\n\nРазница между аналитиком и решающим — не в объёме знаний. Аналитик собирает ещё один факт. Решающий знает, когда остановиться и шагнуть.",
      },
    },
    {
      id: "evidence",
      kind: "evidence",
      data: {
        statistic: "в 3,4 раза",
        source: "Kahneman & Klein, 2009",
        description:
          "Эксперты, принимающие решение при 40% доступной информации, ошибаются в 3,4 раза реже тех, кто ждёт 80%. Промедление стоит дороже, чем неполнота.",
      },
    },
    {
      id: "example",
      kind: "example",
      data: {
        title: "Наполеон на мосту через Дунай",
        story:
          "В 1805 году Наполеон подошёл к мосту, который австрийцы должны были взорвать. Разведка молчала: заминирован или нет — неизвестно. Ждать — потерять темп. Наполеон послал двух офицеров в парадных мундирах через мост с белым флагом, будто на переговоры. Пока австрийцы думали, французы перешли. Мост остался цел. Решение без полной информации — это не риск. Это темп.",
      },
    },
    {
      id: "quiz",
      kind: "quiz",
      data: {
        question:
          "Перед тобой выбор: действовать на 40% известного или ждать ещё час ради 60%. Что определяет правильный ход?",
        options: [
          {
            text: "Всегда ждать — больше данных уменьшают риск.",
            isCorrect: false,
            explanation:
              "Ожидание тоже имеет цену — темп, окно возможности, настрой. Бездействие не бесплатно.",
          },
          {
            text: "Всегда действовать — скорость важнее точности.",
            isCorrect: false,
            explanation:
              "Скорость без минимума фактов — это лотерея. У любого решения есть порог достаточности.",
          },
          {
            text: "Смотреть на цену ошибки vs цену промедления в этой ситуации.",
            isCorrect: true,
            explanation:
              "Именно это и есть стратегическое мышление: сравнивать стоимость действия и стоимость ожидания, а не следовать универсальному правилу.",
          },
          {
            text: "Спросить более опытного — он знает больше.",
            isCorrect: false,
            explanation:
              "Перенос решения — это отказ от субъектности. Опыт другого не заменит твоего выбора в твоём контексте.",
          },
        ],
      },
    },
    {
      id: "explain",
      kind: "explain",
      data: {
        prompt:
          "Сформулируй своими словами: что определяет, когда пора решать, а когда ещё рано?",
      },
    },
    {
      id: "thread",
      kind: "thread",
      data: {
        yesterday: {
          title: "Цена промедления",
          subtitle: "Время как ресурс",
        },
        today: {
          title: "Решение без полной информации",
          subtitle: "Порог достаточности",
        },
        tomorrow: {
          title: "Обратимость решения",
          subtitle: "Когда можно рискнуть",
        },
      },
    },
    {
      id: "wisdom",
      kind: "wisdom",
      data: {
        quote:
          "Не знать — это состояние. Бездействовать из-за незнания — это выбор.",
        author: "РАЗУМ",
      },
    },
  ],
};

export default function LearningDayPage() {
  const router = useRouter();
  const lesson = DEMO_LESSON;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  // Отслеживаем активную карточку по пересечению с центром вьюпорта.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = Number((visible.target as HTMLElement).dataset.cardIndex);
        if (!Number.isNaN(idx)) setActiveIndex(idx);
      },
      {
        root,
        threshold: [0.35, 0.55, 0.75],
      },
    );
    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const total = lesson.cards.length;
  const progressLabel = `${activeIndex + 1} / ${total}`;

  // Условный стаб для AI-оценки в ExplainCard — демонстрирует флоу без бэкенда.
  const explainStub = useMemo(
    () =>
      async (text: string): Promise<ExplainResult> => {
        await new Promise((r) => setTimeout(r, 900));
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        if (words < 8) {
          return {
            verdict: "missed",
            feedback:
              "Мысль слишком короткая. Проверь: есть ли там порог, есть ли сравнение цены?",
          };
        }
        if (words < 25) {
          return {
            verdict: "partial",
            feedback:
              "Ты уловил часть. Добавь: о какой именно стоимости промедления ты говоришь и чем она измеряется.",
          };
        }
        return {
          verdict: "caught",
          feedback:
            "Ясно. Ты назвал оба полюса — цену действия и цену ожидания. Это и есть рабочая рамка.",
        };
      },
    [],
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* aurora-фон — согласован с /learning */}
      <div
        className="pointer-events-none fixed -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-[120px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(107,125,140,0.25) 0%, rgba(107,125,140,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed -bottom-40 -right-32 w-[560px] h-[560px] rounded-full blur-[140px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(139,46,46,0.16) 0%, rgba(139,46,46,0) 70%)",
          animationDelay: "-9s",
        }}
      />

      {/* Фиксированный заголовок */}
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push("/learning")}
            aria-label="Вернуться к пути"
            className="font-ritual text-[10px] tracking-[0.35em] uppercase text-text-muted hover:text-text-primary transition-colors"
          >
            ← Путь
          </button>
          <div className="flex-1 text-center min-w-0">
            <div className="font-ritual text-[9px] sm:text-[10px] tracking-[0.4em] uppercase text-cold-steel mb-0.5">
              День {lesson.dayIndex}
            </div>
            <div className="font-verse text-sm sm:text-base text-text-primary truncate">
              {lesson.topicTitle}
            </div>
          </div>
          <div
            className="font-ritual text-[11px] sm:text-xs tracking-[0.2em] text-text-secondary tabular-nums min-w-[48px] text-right"
            aria-label={`Карточка ${activeIndex + 1} из ${total}`}
          >
            {progressLabel}
          </div>
        </div>
        {/* Тонкая линия прогресса */}
        <div className="h-px w-full bg-border/40">
          <div
            className="h-full bg-accent/70 transition-all duration-300"
            style={{ width: `${((activeIndex + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      {/* Лента карточек — scroll-snap по вертикали */}
      <div
        ref={containerRef}
        className="relative z-10 h-screen overflow-y-auto snap-y snap-mandatory pt-20 sm:pt-24"
        style={{ scrollBehavior: "smooth" }}
      >
        {lesson.cards.map((card, i) => (
          <section
            key={card.id}
            data-card-index={i}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            className="snap-start min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 sm:px-6 py-10"
          >
            <div className="w-full max-w-2xl mx-auto">
              <CardRenderer card={card} onExplain={explainStub} />
            </div>
          </section>
        ))}

        {/* Завершение дня */}
        <section className="snap-start min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-12">
          <div className="text-center animate-[slide-up_0.5s_ease-out]">
            <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-cold-steel mb-6">
              — День пройден —
            </div>
            <button
              type="button"
              onClick={() => router.push("/learning")}
              className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-10 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] transition-all duration-300"
            >
              К пути
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Рендерер карточки по типу ──────────────────────────────────────────
interface CardRendererProps {
  card: LessonCard;
  onExplain: (text: string) => Promise<ExplainResult>;
}

function CardRenderer({ card, onExplain }: CardRendererProps) {
  switch (card.kind) {
    case "hook": {
      const d = card.data as { text: string };
      return <HookCard text={d.text} />;
    }
    case "explanation": {
      const d = card.data as { title: string; body: string };
      // F22.10 — «Глубже» доступно в Раскрытии; пока handler — no-op stub,
      // инлайн-вставку доп-карточек F23 подключит L23/F23 блок.
      return <ExplanationCard title={d.title} body={d.body} onDeeper={() => {}} />;
    }
    case "evidence": {
      const d = card.data as {
        statistic: string;
        source: string;
        description: string;
      };
      return (
        <EvidenceCard
          statistic={d.statistic}
          source={d.source}
          description={d.description}
          onDeeper={() => {}}
        />
      );
    }
    case "example": {
      const d = card.data as { title: string; story: string };
      return <ExampleCard title={d.title} story={d.story} />;
    }
    case "quiz": {
      const d = card.data as React.ComponentProps<typeof QuizCard>;
      return <QuizCard question={d.question} options={d.options} />;
    }
    case "explain": {
      const d = card.data as { prompt: string };
      return <ExplainCard prompt={d.prompt} onSubmit={onExplain} />;
    }
    case "thread": {
      const d = card.data as React.ComponentProps<typeof ThreadCard>;
      return (
        <ThreadCard
          yesterday={d.yesterday}
          today={d.today}
          tomorrow={d.tomorrow}
        />
      );
    }
    case "wisdom": {
      const d = card.data as { quote: string; author: string };
      return <WisdomLearningCard quote={d.quote} author={d.author} />;
    }
  }
}
