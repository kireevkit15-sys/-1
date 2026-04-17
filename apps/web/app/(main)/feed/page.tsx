"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import InsightCard from "@/components/feed/InsightCard";
import ChallengeCard from "@/components/feed/ChallengeCard";
import CaseCard from "@/components/feed/CaseCard";
import SparringCard from "@/components/feed/SparringCard";
import ForgeCard from "@/components/feed/ForgeCard";
import WisdomCard from "@/components/feed/WisdomCard";
import ArenaCard from "@/components/feed/ArenaCard";
import type {
  DailyFeedData,
  FeedCard,
  InsightContent,
  ChallengeContent,
  CaseContent,
  SparringContent,
  ForgeContent,
  WisdomContent,
  ArenaContent,
} from "@razum/shared";
import { API_BASE } from "@/lib/api/base";
import { BRANCHES, branchAlpha } from "@/lib/branches";

// Branch colours derived from single source of truth (lib/branches.ts)
const BRANCH_COLORS: Record<string, string> = Object.fromEntries(
  Object.values(BRANCHES).map((b) => [b.key, b.color]),
);

const BRANCH_BG_TINTS: Record<string, string> = Object.fromEntries(
  Object.values(BRANCHES).map((b) => [b.key, branchAlpha(b, 0.03)]),
);

// ── Swipe threshold ────────────────────────────────
const SWIPE_THRESHOLD = 50;

// ── Demo Feed (fallback for testing without API) ───
const DEMO_FEED: DailyFeedData = {
  date: new Date().toISOString().slice(0, 10),
  totalCards: 10,
  viewedCards: 0,
  campaignProgress: [
    {
      campaignId: "demo-1",
      campaignTitle: "Основы стратегического мышления",
      currentDay: 3,
      totalDays: 14,
      branch: "STRATEGY" as DailyFeedData["campaignProgress"][0]["branch"],
    },
  ],
  streak: { current: 5, feedStreak: 3, isOnFire: false },
  cards: [
    {
      id: "demo-insight-1",
      type: "INSIGHT" as FeedCard["type"],
      branch: "STRATEGY" as FeedCard["branch"],
      campaignId: "demo-1",
      content: {
        type: "INSIGHT" as const,
        data: {
          title: "Принцип Парето в стратегии",
          body: "80% результатов приходят от 20% усилий. В стратегии это означает фокус на ключевых точках leverage — найти те 20% действий, которые дадут максимальный эффект.",
          example: "Amazon сосредоточился на книгах, а не на всём ритейле, — и это дало 80% начального роста.",
          source: "Вильфредо Парето, 1906",
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-challenge-1",
      type: "CHALLENGE" as FeedCard["type"],
      branch: "LOGIC" as FeedCard["branch"],
      campaignId: "demo-1",
      content: {
        type: "CHALLENGE" as const,
        data: {
          questionId: "q-demo-1",
          text: "Какой логический приём используется в аргументе: «Все люди смертны. Сократ — человек. Значит, Сократ смертен»?",
          options: ["Индукция", "Дедукция", "Аналогия", "Абдукция"],
          correctIndex: 1,
          explanation: "Это классический силлогизм — форма дедуктивного рассуждения от общего к частному.",
          xpReward: 15,
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-wisdom-1",
      type: "WISDOM" as FeedCard["type"],
      branch: "STRATEGY" as FeedCard["branch"],
      content: {
        type: "WISDOM" as const,
        data: {
          quote: "Высшее искусство войны — покорить врага без боя.",
          author: "Сунь Цзы",
          authorTitle: "Древнекитайский стратег",
          context: "Стратегия — это не про силу, а про экономию ресурсов. Лучшая победа — та, что досталась без потерь.",
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-case-1",
      type: "CASE" as FeedCard["type"],
      branch: "RHETORIC" as FeedCard["branch"],
      content: {
        type: "CASE" as const,
        data: {
          scenario: "Вы руководите командой из 5 человек. Один сотрудник постоянно опаздывает на совещания, при этом выполняет задачи качественно.",
          question: "Как вы поступите?",
          options: [
            "Публично сделать замечание при всех",
            "Поговорить наедине, выяснить причины",
            "Перенести совещания на удобное ему время",
            "Игнорировать, раз работа выполняется",
          ],
          bestOptionIndex: 1,
          analysis: "Личный разговор сохраняет достоинство сотрудника и позволяет выяснить реальные причины. Публичное замечание разрушает доверие.",
          realExample: "Джефф Безос практикует правило двух пицц — маленькие команды, где каждый на виду и ответственен.",
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-insight-2",
      type: "INSIGHT" as FeedCard["type"],
      branch: "ERUDITION" as FeedCard["branch"],
      content: {
        type: "INSIGHT" as const,
        data: {
          title: "Эффект Даннинга-Крюгера",
          body: "Некомпетентные люди переоценивают свои способности, а эксперты — недооценивают. Это когнитивное искажение, открытое в 1999 году.",
          example: "Новичок в шахматах уверен, что обыграет любителя. Гроссмейстер же сомневается даже в партии с равным соперником.",
          source: "Kruger & Dunning, Cornell University, 1999",
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-sparring-1",
      type: "SPARRING" as FeedCard["type"],
      branch: "LOGIC" as FeedCard["branch"],
      content: {
        type: "SPARRING" as const,
        data: {
          questionId: "q-demo-2",
          text: "Если «все A являются B» и «некоторые B являются C», можно ли утверждать, что «некоторые A являются C»?",
          options: ["Да, всегда", "Нет, нельзя", "Только если C подмножество A", "Зависит от контекста"],
          correctIndex: 1,
          explanation: "Это ошибка нераспределённого среднего термина. Из «все кошки — животные» и «некоторые животные — собаки» не следует, что «некоторые кошки — собаки».",
          opponentName: "Призрак логика",
          opponentTimeMs: 8500,
          opponentCorrect: true,
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-forge-1",
      type: "FORGE" as FeedCard["type"],
      branch: "STRATEGY" as FeedCard["branch"],
      content: {
        type: "FORGE" as const,
        data: {
          originalCardId: "prev-card-1",
          questionId: "q-demo-3",
          text: "Какой из факторов НЕ входит в модель пяти сил Портера?",
          options: ["Угроза новых участников", "Технологические тренды", "Власть поставщиков", "Угроза товаров-заменителей"],
          correctIndex: 1,
          explanation: "Пять сил Портера: конкуренция, новые участники, поставщики, покупатели, заменители. Технологии — это отдельный фактор PESTEL-анализа.",
          failedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          attempt: 2,
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-wisdom-2",
      type: "WISDOM" as FeedCard["type"],
      branch: "INTUITION" as FeedCard["branch"],
      content: {
        type: "WISDOM" as const,
        data: {
          quote: "Интуиция — это священный дар, а рациональный ум — верный слуга. Мы создали общество, которое чтит слугу и забыло дар.",
          author: "Альберт Эйнштейн",
          context: "Интуиция тренируется через глубокое погружение в предмет. Чем больше знаешь, тем точнее чутьё.",
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-challenge-2",
      type: "CHALLENGE" as FeedCard["type"],
      branch: "ERUDITION" as FeedCard["branch"],
      content: {
        type: "CHALLENGE" as const,
        data: {
          questionId: "q-demo-4",
          text: "Какой философ ввёл понятие «сверхчеловека» (Ubermensch)?",
          options: ["Платон", "Ницше", "Кант", "Шопенгауэр"],
          correctIndex: 1,
          explanation: "Фридрих Ницше ввёл понятие сверхчеловека в книге «Так говорил Заратустра» (1883) как идеал преодоления человеческих слабостей.",
          xpReward: 20,
        },
      } as FeedCard["content"],
    },
    {
      id: "demo-arena-1",
      type: "ARENA" as FeedCard["type"],
      branch: "STRATEGY" as FeedCard["branch"],
      content: {
        type: "ARENA" as const,
        data: {
          message: "Ты изучил 4 концепта по Стратегии. Проверь себя в бою!",
          branch: "STRATEGY" as FeedCard["branch"],
          conceptsLearned: 4,
          suggestedDifficulty: "MEDIUM" as unknown as import("@razum/shared").Difficulty,
        },
      } as FeedCard["content"],
    },
  ],
};

// ── Loading Skeleton ───────────────────────────────
function FeedSkeleton() {
  return (
    <div className="h-[calc(100dvh-5rem)] flex flex-col gap-4 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-2 w-32 rounded-full bg-[#1e1e1e]" />
        <div className="h-4 w-16 rounded bg-[#1e1e1e]" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#1e1e1e]" />
      <div className="h-8 w-56 rounded-lg bg-[#1e1e1e]" />
      <div className="flex-1 rounded-2xl bg-[#141414] border border-[#1e1e1e]" />
    </div>
  );
}

// ── No Campaign Prompt ─────────────────────────────
function NoCampaignPrompt() {
  return (
    <div className="h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#141414] border border-[#1e1e1e] flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-neutral-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        Начни кампанию, чтобы получить ленту
      </h2>
      <p className="text-neutral-400 text-sm mb-8 max-w-xs leading-relaxed">
        Выбери ветвь знаний и пройди первую кампанию. Каждый день — новые
        карточки, вызовы и бои.
      </p>
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm
          bg-gradient-to-r from-cyan-500 to-cyan-400 text-black
          hover:from-cyan-400 hover:to-cyan-300 transition-all active:scale-95"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
        Выбрать кампанию
      </Link>
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────
function FeedProgressBar({
  viewed,
  total,
  streak,
}: {
  viewed: number;
  total: number;
  streak: DailyFeedData["streak"];
}) {
  const pct = total > 0 ? Math.min((viewed / total) * 100, 100) : 0;
  const isOnFire = streak.isOnFire;

  return (
    <div className="px-4 pt-3 pb-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-neutral-400">
          {viewed}/{total} карточек сегодня
        </span>
        <span
          className={`text-xs font-bold flex items-center gap-1 ${
            isOnFire ? "text-orange-400" : "text-neutral-500"
          }`}
        >
          {isOnFire && (
            <span className="animate-pulse drop-shadow-[0_0_6px_rgba(249,115,22,0.7)]">
              🔥
            </span>
          )}
          {streak.current} дн. серия
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#1e1e1e] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: isOnFire
              ? "linear-gradient(90deg, #F97316, #EF4444)"
              : "linear-gradient(90deg, #06B6D4, #22C55E)",
            boxShadow: isOnFire
              ? "0 0 12px rgba(249,115,22,0.5)"
              : "0 0 8px rgba(6,182,212,0.3)",
          }}
        />
      </div>
    </div>
  );
}

// ── Campaign Context Pills ─────────────────────────
function CampaignPills({
  progress,
}: {
  progress: DailyFeedData["campaignProgress"];
}) {
  if (!progress.length) return null;

  return (
    <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
      {progress.map((cp) => {
        const color = BRANCH_COLORS[cp.branch] ?? "#06B6D4";
        const pct =
          cp.totalDays > 0
            ? Math.round((cp.currentDay / cp.totalDays) * 100)
            : 0;
        return (
          <div
            key={cp.campaignId}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: `${color}10`,
              color,
              borderLeft: `3px solid ${color}`,
            }}
          >
            <span className="truncate max-w-[180px]">
              День {cp.currentDay} — {cp.campaignTitle}
            </span>
            <span className="ml-auto text-[10px] opacity-60 whitespace-nowrap">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Card Renderer ──────────────────────────────────
function renderCard(
  card: FeedCard,
  onInteract: (
    cardId: string,
    type: string,
    extra?: Record<string, unknown>,
  ) => void,
) {
  const props = {
    content: card.content,
    onInteract: (type: string, extra?: Record<string, unknown>) =>
      onInteract(card.id, type, extra),
  };

  switch (card.type) {
    case "INSIGHT":
      return (
        <InsightCard
          key={card.id}
          data={card.content.data as InsightContent}
          branch={card.branch}
          onViewed={() => onInteract(card.id, "VIEWED")}
        />
      );
    case "CHALLENGE":
      return (
        <ChallengeCard
          key={card.id}
          data={card.content.data as ChallengeContent}
          branch={card.branch}
          onAnswer={(correct: boolean, answerIndex: number) =>
            onInteract(card.id, "ANSWERED", { correct, answerIndex })
          }
        />
      );
    case "CASE":
      return (
        <CaseCard
          key={card.id}
          data={card.content.data as CaseContent}
          branch={card.branch}
          onAnswer={(correct: boolean, answerIndex: number) =>
            onInteract(card.id, "ANSWERED", { correct, answerIndex })
          }
        />
      );
    case "SPARRING":
      return (
        <SparringCard
          key={card.id}
          data={card.content.data as SparringContent}
          branch={card.branch}
          onAnswer={(correct: boolean, answerIndex: number) =>
            onInteract(card.id, "ANSWERED", { correct, answerIndex })
          }
        />
      );
    case "FORGE":
      return (
        <ForgeCard
          key={card.id}
          data={card.content.data as ForgeContent}
          branch={card.branch}
          onAnswer={(correct: boolean, answerIndex: number) =>
            onInteract(card.id, "ANSWERED", { correct, answerIndex })
          }
        />
      );
    case "WISDOM":
      return (
        <WisdomCard
          key={card.id}
          data={card.content.data as WisdomContent}
          branch={card.branch}
        />
      );
    case "ARENA":
      return (
        <ArenaCard
          key={card.id}
          data={card.content.data as ArenaContent}
          onArenaClick={() => onInteract(card.id, "ARENA_CLICKED")}
        />
      );
    default:
      return null;
  }
}

// ── Main Feed Page ─────────────────────────────────
export default function FeedPage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [feed, setFeed] = useState<DailyFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const viewedSet = useRef<Set<string>>(new Set());

  // Swipe state refs and values
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const cards = feed?.cards ?? [];
  const totalCards = cards.length;

  // ── Fetch daily feed ───────────────────────────
  const fetchFeed = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/feed/today`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: DailyFeedData = json.data ?? json;
      setFeed(data);
      setIsDemo(false);
    } catch {
      // Fallback to demo feed on any error
      setFeed(DEMO_FEED);
      setIsDemo(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    if (accessToken) {
      fetchFeed();
    } else {
      // No auth — show demo mode
      setFeed(DEMO_FEED);
      setIsDemo(true);
      setLoading(false);
    }
  }, [authLoading, accessToken, fetchFeed]);

  // ── Post interaction ───────────────────────────
  const postInteract = useCallback(
    async (cardId: string, type: string, extra?: Record<string, unknown>) => {
      if (!accessToken || isDemo) return;
      try {
        await fetch(`${API_BASE}/feed/interact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ cardId, type, ...extra }),
        });
        if (type === "VIEWED") {
          setFeed((prev) =>
            prev ? { ...prev, viewedCards: prev.viewedCards + 1 } : prev,
          );
        }
      } catch {
        // Silent fail — non-critical
      }
    },
    [accessToken, isDemo],
  );

  // ── Mark card as viewed ────────────────────────
  const markViewed = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalCards) return;
      const card = cards[index];
      if (!card || viewedSet.current.has(card.id)) return;
      viewedSet.current.add(card.id);
      postInteract(card.id, "VIEWED");
    },
    [cards, totalCards, postInteract],
  );

  // ── Navigate to card (smooth transition) ───────
  const goToCard = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalCards || isTransitioning) return;
      setIsTransitioning(true);
      setActiveIndex(index);
      setDragOffset(0);
      markViewed(index);
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [totalCards, markViewed, isTransitioning],
  );

  // Mark first card as viewed on mount
  useEffect(() => {
    if (totalCards > 0) {
      markViewed(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCards]);

  // ── Touch events for swipe detection ──────────
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isTransitioning) return;
      const touch = e.touches[0];
      if (touch) {
        touchStartY.current = touch.clientY;
      }
      touchDeltaY.current = 0;
    },
    [isTransitioning],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isTransitioning) return;
      const touch = e.touches[0];
      if (!touch) return;
      const delta = touch.clientY - touchStartY.current;
      touchDeltaY.current = delta;

      // Rubber-band effect at boundaries
      if (activeIndex === 0 && delta > 0) {
        setDragOffset(delta * 0.25);
      } else if (activeIndex === totalCards - 1 && delta < 0) {
        setDragOffset(delta * 0.25);
      } else {
        setDragOffset(delta);
      }
    },
    [isTransitioning, activeIndex, totalCards],
  );

  const handleTouchEnd = useCallback(() => {
    if (isTransitioning) return;
    const delta = touchDeltaY.current;

    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0 && activeIndex < totalCards - 1) {
        goToCard(activeIndex + 1);
      } else if (delta > 0 && activeIndex > 0) {
        goToCard(activeIndex - 1);
      } else {
        setDragOffset(0);
      }
    } else {
      setDragOffset(0);
    }
  }, [isTransitioning, activeIndex, totalCards, goToCard]);

  // ── Mouse wheel for desktop scrolling ─────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let wheelTimeout: ReturnType<typeof setTimeout> | null = null;
    let accumulated = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      accumulated += e.deltaY;

      if (wheelTimeout) clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulated) > SWIPE_THRESHOLD) {
          if (accumulated > 0 && activeIndex < totalCards - 1) {
            goToCard(activeIndex + 1);
          } else if (accumulated < 0 && activeIndex > 0) {
            goToCard(activeIndex - 1);
          }
        }
        accumulated = 0;
      }, 80);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
      if (wheelTimeout) clearTimeout(wheelTimeout);
    };
  }, [activeIndex, totalCards, goToCard]);

  // ── Keyboard navigation (arrows + space) ──────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        if (activeIndex < totalCards - 1) goToCard(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeIndex > 0) goToCard(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, totalCards, goToCard]);

  // ── Handle card interact ───────────────────────
  const handleInteract = useCallback(
    (cardId: string, type: string, extra?: Record<string, unknown>) => {
      postInteract(cardId, type, extra);
    },
    [postInteract],
  );

  // ── Render: loading ────────────────────────────
  if (authLoading || loading) return <FeedSkeleton />;

  // ── Render: hard error (no fallback available) ─
  if (error && !feed) {
    return (
      <div className="h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={fetchFeed}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1e1e1e] text-white
            hover:bg-[#282828] transition-colors active:scale-95"
        >
          Повторить
        </button>
      </div>
    );
  }

  // ── Render: no campaign started ────────────────
  if (!feed || (!feed.campaignProgress.length && !isDemo)) {
    return <NoCampaignPrompt />;
  }

  // ── Render: all cards completed ────────────────
  if (!cards.length) {
    return (
      <div className="h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl mb-4">&#10003;</div>
        <h2 className="text-lg font-bold text-white mb-2">
          Все карточки на сегодня пройдены
        </h2>
        <p className="text-neutral-400 text-sm">
          Возвращайся завтра за новой порцией знаний.
        </p>
      </div>
    );
  }

  // ── Derive current card styling ────────────────
  const currentCard = cards[activeIndex];
  const branchBg = currentCard
    ? (BRANCH_BG_TINTS[currentCard.branch] ?? "transparent")
    : "transparent";

  return (
    <div
      className="flex flex-col h-[calc(100dvh-5rem)] overflow-hidden select-none"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Demo mode indicator */}
      {isDemo && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-[10px] font-medium text-yellow-500">
              DEMO
            </span>
            <span className="text-[10px] text-yellow-500/70">
              Демо-режим — данные из API недоступны
            </span>
          </div>
        </div>
      )}

      {/* Progress bar: "7/25 карточек сегодня" + streak in top-right */}
      <FeedProgressBar
        viewed={isDemo ? viewedSet.current.size : feed.viewedCards}
        total={feed.totalCards}
        streak={feed.streak}
      />

      {/* Campaign progress pills at the top */}
      <CampaignPills progress={feed.campaignProgress} />

      {/* Dot navigation indicators */}
      <div className="flex items-center justify-center gap-1 pb-2 px-4">
        {cards.map((card, i) => {
          const dotColor = BRANCH_COLORS[card.branch] ?? "#06B6D4";
          const isActive = i === activeIndex;
          const isViewed = viewedSet.current.has(card.id);
          return (
            <button
              key={card.id}
              onClick={() => goToCard(i)}
              aria-label={`Карточка ${i + 1}`}
              className="rounded-full transition-all duration-300 flex-shrink-0"
              style={{
                width: isActive ? 18 : 6,
                height: 6,
                backgroundColor: isActive
                  ? dotColor
                  : isViewed
                    ? `${dotColor}60`
                    : "#1e1e1e",
                boxShadow: isActive ? `0 0 10px ${dotColor}50` : "none",
              }}
            />
          );
        })}
      </div>

      {/* ── TikTok-style swipeable feed container ── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ background: branchBg }}
      >
        {cards.map((card, i) => {
          const offset = i - activeIndex;
          // Only render prev, current, and next cards for performance
          if (Math.abs(offset) > 1) return null;

          const cardBranchColor = BRANCH_COLORS[card.branch] ?? "#06B6D4";
          const baseTranslatePercent = offset * 100;
          const currentDrag = !isTransitioning ? dragOffset : 0;

          return (
            <div
              key={card.id}
              className="absolute inset-0 px-3 pb-3"
              style={{
                transform: `translateY(calc(${baseTranslatePercent}% + ${currentDrag}px))`,
                transition: isTransitioning
                  ? "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                  : currentDrag !== 0
                    ? "none"
                    : "transform 0.15s ease-out",
                willChange: "transform",
                zIndex: offset === 0 ? 2 : 1,
              }}
            >
              <div
                className="h-full rounded-2xl overflow-hidden relative flex flex-col"
                style={{
                  backgroundColor: "#141414",
                  borderLeft: `3px solid ${cardBranchColor}`,
                  boxShadow: `inset 4px 0 24px -4px ${cardBranchColor}15, 0 0 0 1px #1e1e1e`,
                }}
              >
                {/* Card type badge (top-right corner) */}
                <div className="absolute top-3 right-3 z-10">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${cardBranchColor}15`,
                      color: cardBranchColor,
                    }}
                  >
                    {card.type}
                  </span>
                </div>

                {/* Card content — internal scroll for long content */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {renderCard(card, handleInteract)}
                </div>

                {/* Animated swipe-up hint at bottom */}
                {i === activeIndex && i < totalCards - 1 && (
                  <div className="flex justify-center pb-2 pt-1 opacity-30">
                    <svg
                      className="w-4 h-4 text-neutral-400 animate-bounce"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M7 13l5 5 5-5" />
                      <path d="M7 6l5 5 5-5" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card counter at the bottom */}
      <div className="flex items-center justify-center py-2">
        <span className="text-[11px] text-neutral-600 font-medium">
          {activeIndex + 1} / {totalCards}
        </span>
      </div>
    </div>
  );
}
