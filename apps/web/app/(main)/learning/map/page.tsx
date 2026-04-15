"use client";

/**
 * F25 — Карта знаний.
 * Сетка всех концептов с цветовой индикацией уровня усвоения,
 * фильтрами по веткам, поиском и статистикой.
 *
 * F25.1: сетка-ячейки (цвет по мастерству)
 * F25.2: детали концепта при клике (bottom-sheet)
 * F25.3: фильтр по ветке + поиск
 * F25.4: статистика «Освоено N из M»
 */

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getMasteryMap,
  LearningApiError,
  type ConceptMastery,
  type BranchKey,
  type MasteryMapResponse,
} from "@/lib/api/learning";
import TutorSheet from "@/components/learning/TutorSheet";

const BRANCHES: Array<{ key: BranchKey; name: string; colorClass: string; bg: string }> = [
  { key: "STRATEGY", name: "Стратегия", colorClass: "text-branch-strategy", bg: "rgba(6,182,212,0.14)" },
  { key: "LOGIC", name: "Логика", colorClass: "text-branch-logic", bg: "rgba(34,197,94,0.14)" },
  { key: "ERUDITION", name: "Эрудиция", colorClass: "text-branch-erudition", bg: "rgba(168,85,247,0.14)" },
  { key: "RHETORIC", name: "Риторика", colorClass: "text-branch-rhetoric", bg: "rgba(249,115,22,0.14)" },
  { key: "INTUITION", name: "Интуиция", colorClass: "text-branch-intuition", bg: "rgba(236,72,153,0.14)" },
];

const BRANCH_BY_KEY = Object.fromEntries(BRANCHES.map((b) => [b.key, b])) as Record<
  BranchKey,
  (typeof BRANCHES)[number]
>;

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: MasteryMapResponse; isDemo: boolean }
  | { phase: "auth-required" }
  | { phase: "error"; message: string };

export default function KnowledgeMapPage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [selectedBranch, setSelectedBranch] = useState<BranchKey | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selectedConcept, setSelectedConcept] = useState<ConceptMastery | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getMasteryMap(accessToken);
        if (!cancelled) setState({ phase: "ready", data, isDemo: false });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof LearningApiError && e.kind === "network") {
          setState({ phase: "ready", isDemo: true, data: DEMO_DATA });
          return;
        }
        if (e instanceof LearningApiError && e.kind === "auth") {
          setState({ phase: "auth-required" });
          return;
        }
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : "Неизвестная ошибка",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading]);

  const filtered = useMemo(() => {
    if (state.phase !== "ready") return [];
    const q = query.trim().toLowerCase();
    return state.data.map.filter((c) => {
      if (selectedBranch !== "ALL" && c.branch !== selectedBranch) return false;
      if (q && !c.nameRu.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [state, selectedBranch, query]);

  if (authLoading || state.phase === "loading") {
    return (
      <PageShell>
        <div className="max-w-md mx-auto text-center py-24">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-accent animate-pulse">
            Загрузка карты
          </div>
        </div>
      </PageShell>
    );
  }

  if (state.phase === "auth-required") {
    return (
      <PageShell>
        <div className="max-w-md mx-auto text-center py-24">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-accent mb-6">
            — Требуется вход —
          </div>
          <p className="font-verse italic text-text-secondary mb-8">
            Карта знаний доступна только авторизованным.
          </p>
          <a
            href="/login"
            className="inline-block font-ritual text-xs tracking-[0.3em] uppercase text-text-primary border border-accent rounded-xl px-8 py-3 hover:bg-accent hover:text-background transition-all duration-300"
          >
            Войти
          </a>
        </div>
      </PageShell>
    );
  }

  if (state.phase === "error") {
    return (
      <PageShell>
        <div className="max-w-md mx-auto text-center py-24">
          <div className="font-ritual text-[10px] tracking-[0.4em] uppercase text-accent-red mb-4">
            — Ошибка —
          </div>
          <p className="font-sans text-xs text-text-muted opacity-70 mb-8">
            {state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-ritual text-xs tracking-[0.3em] uppercase border border-accent rounded-xl px-8 py-3 hover:bg-accent hover:text-background transition-all duration-300"
          >
            Повторить
          </button>
        </div>
      </PageShell>
    );
  }

  const { data, isDemo } = state;
  const percentMastered =
    data.totalConcepts > 0
      ? Math.round((data.masteredCount / data.totalConcepts) * 100)
      : 0;

  return (
    <PageShell>
      {isDemo && (
        <div className="mb-6">
          <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-center text-text-muted border border-border rounded-lg py-2 px-4 bg-surface/60">
            — Демо · бэкенд не запущен —
          </div>
        </div>
      )}

      <header className="mb-8 sm:mb-12">
        <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-accent mb-4">
          — Карта знаний —
        </div>

        {/* Большая цифра + функциональная подпись (Inter, не Cormorant) */}
        <div className="flex items-baseline gap-3 mb-5">
          <span className="text-metallic font-bold text-4xl sm:text-5xl tabular-nums tracking-tight">
            {data.masteredCount}
          </span>
          <span className="text-text-secondary text-2xl sm:text-3xl font-light tabular-nums">
            / {data.totalConcepts}
          </span>
          <span className="text-text-muted text-xs sm:text-sm font-medium tracking-wide uppercase ml-2 pb-1">
            концептов освоено
          </span>
        </div>

        {/* Прогресс-полоса */}
        <div className="relative h-1.5 bg-surface-light rounded-full overflow-hidden mb-2.5">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-warm via-accent to-accent-gold transition-all duration-1000"
            style={{ width: `${percentMastered}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-medium text-text-muted tabular-nums">
          <div className="flex gap-3 sm:gap-4">
            <span>
              <span className="text-accent-gold font-semibold">{data.masteredCount}</span>{" "}
              освоено
            </span>
            <span>
              <span className="text-accent font-semibold">{data.partialCount}</span>{" "}
              частично
            </span>
            <span>
              <span className="text-text-secondary font-semibold">{data.unlearnedCount}</span>{" "}
              не изучено
            </span>
          </div>
          <span className="font-semibold text-text-secondary">{percentMastered}%</span>
        </div>
      </header>

      {/* Фильтры */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterChip
            active={selectedBranch === "ALL"}
            onClick={() => setSelectedBranch("ALL")}
            label="Все ветки"
            count={data.totalConcepts}
          />
          {BRANCHES.map((b) => {
            const stat = data.branchStats[b.key];
            return (
              <FilterChip
                key={b.key}
                active={selectedBranch === b.key}
                onClick={() => setSelectedBranch(b.key)}
                label={b.name}
                count={stat?.total ?? 0}
                colorClass={b.colorClass}
              />
            );
          })}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск концепта…"
          className="w-full bg-surface/60 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Сетка концептов */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 font-verse italic text-text-muted">
          Ничего не найдено.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2 sm:gap-3">
          {filtered.map((concept) => (
            <ConceptCell
              key={concept.id}
              concept={concept}
              onClick={() => setSelectedConcept(concept)}
            />
          ))}
        </div>
      )}

      <div className="mt-8 font-ritual text-[10px] tracking-[0.25em] uppercase text-text-muted text-center">
        Показано {filtered.length} из {data.totalConcepts}
      </div>

      {/* Детали концепта — bottom-sheet */}
      {selectedConcept && (
        <ConceptDetail
          concept={selectedConcept}
          onClose={() => setSelectedConcept(null)}
        />
      )}
    </PageShell>
  );
}

// ── Ячейка концепта ──────────────────────────────────────────────────
function ConceptCell({
  concept,
  onClick,
}: {
  concept: ConceptMastery;
  onClick: () => void;
}) {
  const branch = BRANCH_BY_KEY[concept.branch];
  const tier = masteryTier(concept.mastery);

  return (
    <button
      data-testid="concept-cell"
      data-concept-id={concept.id}
      onClick={onClick}
      className={`group relative text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${TIER_STYLES[tier].border} ${TIER_STYLES[tier].bg}`}
      style={
        tier === "unlearned" ? { borderColor: "rgba(30,30,34,0.8)" } : undefined
      }
      aria-label={`${concept.nameRu}, освоено на ${Math.round(concept.mastery * 100)}%`}
    >
      {/* Полоска ветки слева */}
      <span
        aria-hidden
        className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${branch?.colorClass ?? "text-accent"}`}
        style={{ background: "currentColor", opacity: tier === "unlearned" ? 0.3 : 0.7 }}
      />

      <div className={`font-ritual text-[9px] tracking-[0.2em] uppercase mb-1.5 ${branch?.colorClass ?? "text-accent"} opacity-80`}>
        {branch?.name ?? concept.branch}
      </div>

      <div
        className={`text-[13px] sm:text-sm font-medium leading-snug ${TIER_STYLES[tier].text} line-clamp-3`}
      >
        {concept.nameRu}
      </div>

      {/* Индикатор мастерства — точки */}
      <div className="mt-2.5 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = concept.mastery > i / 5;
          return (
            <span
              key={i}
              className="h-1 w-3 rounded-full"
              style={{
                background: filled ? TIER_STYLES[tier].dotColor : "rgba(255,255,255,0.06)",
              }}
            />
          );
        })}
      </div>
    </button>
  );
}

// ── Детали концепта (bottom-sheet) ───────────────────────────────────
function ConceptDetail({
  concept,
  onClose,
}: {
  concept: ConceptMastery;
  onClose: () => void;
}) {
  const branch = BRANCH_BY_KEY[concept.branch];
  const tier = masteryTier(concept.mastery);
  const percent = Math.round(concept.mastery * 100);
  const [tutorOpen, setTutorOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-[slide-up_0.3s_ease-out]"
      onClick={onClose}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-surface border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-border text-text-muted hover:text-text-primary hover:border-accent transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={`font-ritual text-[10px] tracking-[0.3em] uppercase ${branch?.colorClass ?? "text-accent"} mb-3`}>
          {branch?.name ?? concept.branch} · {concept.difficulty}
        </div>
        <h2 className="font-verse text-2xl sm:text-3xl text-text-primary mb-5 leading-tight">
          {concept.nameRu}
        </h2>

        <div className="space-y-4 mb-6">
          <MasteryRow label="Усвоение" value={`${percent}%`} tier={tier} />
          <div>
            <div className="flex justify-between text-[11px] font-ritual tracking-[0.2em] uppercase text-text-muted mb-1.5">
              <span>Уровень усвоения</span>
              <span className={TIER_STYLES[tier].text}>{TIER_LABELS[tier]}</span>
            </div>
            <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${percent}%`, background: TIER_STYLES[tier].dotColor }}
              />
            </div>
          </div>
          {concept.bloomReached > 0 && (
            <MasteryRow
              label="Таксономия Блума"
              value={`Уровень ${concept.bloomReached} из 6`}
              tier={tier}
            />
          )}
          {concept.lastTestedAt && (
            <MasteryRow
              label="Последняя проверка"
              value={formatDate(concept.lastTestedAt)}
              tier={tier}
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setTutorOpen(true)}
            className="flex-1 font-ritual text-[11px] sm:text-xs tracking-[0.3em] uppercase text-text-primary border border-accent/50 rounded-xl py-3 hover:border-accent hover:bg-accent/5 transition-all duration-300"
          >
            Обсудить
          </button>
          <button
            className="flex-1 font-ritual text-[11px] sm:text-xs tracking-[0.3em] uppercase text-text-primary border border-accent rounded-xl py-3 hover:bg-accent hover:text-background transition-all duration-300"
            onClick={() => {
              // TODO (F23.7): переход к погружению в концепт (depth layers)
              onClose();
            }}
          >
            Погрузиться
          </button>
        </div>
      </div>

      <TutorSheet
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        context={{
          title: concept.nameRu,
          topic: "Обсуждаем концепт",
          prompt: `Ты выбрал обсудить «${concept.nameRu}». Твоё усвоение — ${percent}%. Что именно хочешь прояснить? Суть идеи? Пример из жизни? Или сомнение, которое у тебя возникло?`,
        }}
      />
    </div>
  );
}

function MasteryRow({
  label,
  value,
  tier,
}: {
  label: string;
  value: string;
  tier: MasteryTier;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border">
      <span className="font-ritual text-[11px] tracking-[0.2em] uppercase text-text-muted">
        {label}
      </span>
      <span className={`text-sm font-medium tabular-nums ${TIER_STYLES[tier].text}`}>
        {value}
      </span>
    </div>
  );
}

// ── Filter chip ──────────────────────────────────────────────────────
function FilterChip({
  active,
  onClick,
  label,
  count,
  colorClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  colorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 font-ritual text-[10px] sm:text-[11px] tracking-[0.2em] uppercase px-3 sm:px-4 py-2 rounded-full border transition-all duration-200 ${
        active
          ? "border-accent bg-accent/15 text-accent shadow-neon-accent"
          : "border-border text-text-secondary hover:text-text-primary hover:border-accent/40"
      }`}
    >
      <span className={colorClass ? `${colorClass} mr-1.5` : ""}>●</span>
      {label}
      <span className="ml-1.5 text-text-muted">{count}</span>
    </button>
  );
}

// ── Оболочка страницы (без aurora — это рабочая панель) ──────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">{children}</div>
    </div>
  );
}

// ── Типы уровней усвоения ────────────────────────────────────────────
type MasteryTier = "unlearned" | "partial" | "familiar" | "mastered";

function masteryTier(mastery: number): MasteryTier {
  if (mastery >= 0.8) return "mastered";
  if (mastery >= 0.3) return "familiar";
  if (mastery > 0) return "partial";
  return "unlearned";
}

const TIER_LABELS: Record<MasteryTier, string> = {
  unlearned: "Не изучен",
  partial: "Частично",
  familiar: "Знаком",
  mastered: "Освоен",
};

const TIER_STYLES: Record<
  MasteryTier,
  { border: string; bg: string; text: string; dotColor: string }
> = {
  unlearned: {
    border: "border-border",
    bg: "bg-surface/50 hover:bg-surface",
    text: "text-text-muted",
    dotColor: "#56453A",
  },
  partial: {
    border: "border-accent-warm/40",
    bg: "bg-surface hover:bg-surface-light",
    text: "text-text-secondary",
    dotColor: "#CF9D7B",
  },
  familiar: {
    border: "border-accent/50",
    bg: "bg-accent/5 hover:bg-accent/10",
    text: "text-text-primary",
    dotColor: "#B98D34",
  },
  mastered: {
    border: "border-accent-gold/70",
    bg: "bg-accent-gold/10 hover:bg-accent-gold/15",
    text: "text-accent-gold",
    dotColor: "#E8C89E",
  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

// ── Демо-данные ──────────────────────────────────────────────────────
const DEMO_DATA: MasteryMapResponse = {
  totalConcepts: 24,
  masteredCount: 7,
  partialCount: 9,
  unlearnedCount: 8,
  branchStats: {
    STRATEGY: { total: 6, mastered: 2, avgMastery: 0.35 },
    LOGIC: { total: 5, mastered: 2, avgMastery: 0.48 },
    ERUDITION: { total: 5, mastered: 1, avgMastery: 0.22 },
    RHETORIC: { total: 4, mastered: 1, avgMastery: 0.3 },
    INTUITION: { total: 4, mastered: 1, avgMastery: 0.25 },
  },
  map: [
    { id: "1", slug: "strat-prin", nameRu: "14 принципов Макиавелли", branch: "STRATEGY", category: "Власть", difficulty: "GOLD", mastery: 0.92, bloomReached: 5, lastTestedAt: "2026-04-10T10:00:00Z" },
    { id: "2", slug: "strat-wolf", nameRu: "Волки и овцы", branch: "STRATEGY", category: "Социум", difficulty: "SILVER", mastery: 0.75, bloomReached: 4, lastTestedAt: "2026-04-08T10:00:00Z" },
    { id: "3", slug: "strat-prep", nameRu: "Подготовка к поражению", branch: "STRATEGY", category: "Стратегия", difficulty: "SILVER", mastery: 0.5, bloomReached: 3, lastTestedAt: null },
    { id: "4", slug: "strat-fortune", nameRu: "Фортуна и добродетель", branch: "STRATEGY", category: "Макиавелли", difficulty: "GOLD", mastery: 0.2, bloomReached: 1, lastTestedAt: null },
    { id: "5", slug: "strat-castalia", nameRu: "Касталия как институт", branch: "STRATEGY", category: "Институты", difficulty: "GOLD", mastery: 0, bloomReached: 0, lastTestedAt: null },
    { id: "6", slug: "strat-leader", nameRu: "Лев и лисица", branch: "STRATEGY", category: "Лидерство", difficulty: "SILVER", mastery: 0, bloomReached: 0, lastTestedAt: null },
    { id: "7", slug: "logic-fallacy", nameRu: "Ошибка выжившего", branch: "LOGIC", category: "Когнитивные искажения", difficulty: "BRONZE", mastery: 0.95, bloomReached: 6, lastTestedAt: "2026-04-12T10:00:00Z" },
    { id: "8", slug: "logic-bayes", nameRu: "Байесовский подход", branch: "LOGIC", category: "Рассуждения", difficulty: "GOLD", mastery: 0.82, bloomReached: 5, lastTestedAt: "2026-04-11T10:00:00Z" },
    { id: "9", slug: "logic-occam", nameRu: "Бритва Оккама", branch: "LOGIC", category: "Принципы", difficulty: "BRONZE", mastery: 0.55, bloomReached: 3, lastTestedAt: null },
    { id: "10", slug: "logic-sylogism", nameRu: "Силлогизм", branch: "LOGIC", category: "Аристотель", difficulty: "SILVER", mastery: 0.3, bloomReached: 2, lastTestedAt: null },
    { id: "11", slug: "logic-induct", nameRu: "Индукция Юма", branch: "LOGIC", category: "Эпистемология", difficulty: "GOLD", mastery: 0, bloomReached: 0, lastTestedAt: null },
    { id: "12", slug: "erud-game", nameRu: "Игра в бисер", branch: "ERUDITION", category: "Гессе", difficulty: "GOLD", mastery: 0.88, bloomReached: 5, lastTestedAt: "2026-04-09T10:00:00Z" },
    { id: "13", slug: "erud-feuil", nameRu: "Фельетонистическая эпоха", branch: "ERUDITION", category: "Гессе", difficulty: "SILVER", mastery: 0.4, bloomReached: 2, lastTestedAt: null },
    { id: "14", slug: "erud-nietz", nameRu: "Воля к власти", branch: "ERUDITION", category: "Ницше", difficulty: "GOLD", mastery: 0.25, bloomReached: 1, lastTestedAt: null },
    { id: "15", slug: "erud-schop", nameRu: "Мир как воля", branch: "ERUDITION", category: "Шопенгауэр", difficulty: "GOLD", mastery: 0, bloomReached: 0, lastTestedAt: null },
    { id: "16", slug: "erud-thale", nameRu: "Талес и первоначало", branch: "ERUDITION", category: "Досократики", difficulty: "BRONZE", mastery: 0.6, bloomReached: 3, lastTestedAt: null },
    { id: "17", slug: "rhet-ethos", nameRu: "Этос, пафос, логос", branch: "RHETORIC", category: "Аристотель", difficulty: "SILVER", mastery: 0.85, bloomReached: 5, lastTestedAt: "2026-04-07T10:00:00Z" },
    { id: "18", slug: "rhet-frame", nameRu: "Фрейминг", branch: "RHETORIC", category: "Психология", difficulty: "BRONZE", mastery: 0.45, bloomReached: 2, lastTestedAt: null },
    { id: "19", slug: "rhet-lakoff", nameRu: "Метафоры Лакоффа", branch: "RHETORIC", category: "Лингвистика", difficulty: "SILVER", mastery: 0.2, bloomReached: 1, lastTestedAt: null },
    { id: "20", slug: "rhet-debate", nameRu: "Структура дебатов", branch: "RHETORIC", category: "Практика", difficulty: "BRONZE", mastery: 0, bloomReached: 0, lastTestedAt: null },
    { id: "21", slug: "intu-gut", nameRu: "Мышление быстрое и медленное", branch: "INTUITION", category: "Канеман", difficulty: "SILVER", mastery: 0.9, bloomReached: 5, lastTestedAt: "2026-04-06T10:00:00Z" },
    { id: "22", slug: "intu-heur", nameRu: "Эвристика доступности", branch: "INTUITION", category: "Канеман", difficulty: "BRONZE", mastery: 0.35, bloomReached: 2, lastTestedAt: null },
    { id: "23", slug: "intu-gigeren", nameRu: "Экологическая рациональность", branch: "INTUITION", category: "Гигеренцер", difficulty: "GOLD", mastery: 0, bloomReached: 0, lastTestedAt: null },
    { id: "24", slug: "intu-dream", nameRu: "Интуиция и подсознание", branch: "INTUITION", category: "Юнг", difficulty: "SILVER", mastery: 0, bloomReached: 0, lastTestedAt: null },
  ],
};
