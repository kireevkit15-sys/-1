"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE } from "@/lib/api/base";
import { BRANCHES } from "@/lib/branches";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignDay {
  day: number;
  cardCount: number;
  completed?: boolean;
}

interface CampaignDetail {
  id: string;
  title: string;
  description: string;
  branch: string;
  durationDays: number;
  days: CampaignDay[];
  requiredRank?: string;
  requiredXp?: number;
  /** User-specific */
  started?: boolean;
  currentDay?: number;
  completedDays?: number;
  progress?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCH_COLORS: Record<string, string> = Object.fromEntries(
  Object.values(BRANCHES).map((b) => [b.key, b.color]),
);

const BRANCH_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(BRANCHES).map((b) => [b.key, b.label]),
);

// ---------------------------------------------------------------------------
// Demo data (shown when API is not available)
// ---------------------------------------------------------------------------

const DEMO_CAMPAIGNS: Record<string, CampaignDetail> = {
  "demo-first-principles": {
    id: "demo-first-principles",
    title: "Первые принципы",
    description: "Научись мыслить с нуля: декомпозиция, аналогии, инверсия. Фундамент стратегического мышления. Каждый день — новый инструмент мышления с практическими заданиями.",
    branch: "STRATEGY",
    durationDays: 7,
    requiredRank: "NOVICE",
    days: [
      { day: 1, cardCount: 5 },
      { day: 2, cardCount: 4 },
      { day: 3, cardCount: 5 },
      { day: 4, cardCount: 6 },
      { day: 5, cardCount: 5 },
      { day: 6, cardCount: 4 },
      { day: 7, cardCount: 6 },
    ],
  },
  "demo-logic-basics": {
    id: "demo-logic-basics",
    title: "Основы логики",
    description: "Дедукция, индукция, логические ошибки. Построй непробиваемую аргументацию. Распознавай софизмы и ловушки мышления.",
    branch: "LOGIC",
    durationDays: 7,
    requiredRank: "NOVICE",
    days: [
      { day: 1, cardCount: 5 },
      { day: 2, cardCount: 5 },
      { day: 3, cardCount: 4 },
      { day: 4, cardCount: 6 },
      { day: 5, cardCount: 5 },
      { day: 6, cardCount: 5 },
      { day: 7, cardCount: 5 },
    ],
  },
  "demo-negotiator": {
    id: "demo-negotiator",
    title: "Переговорщик",
    description: "Стратегии переговоров, BATNA, якорение, управление уступками. Побеждай за столом переговоров. 12 дней интенсивной практики.",
    branch: "STRATEGY",
    durationDays: 12,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 12 }, (_, i) => ({ day: i + 1, cardCount: i < 6 ? 5 : 6 })),
  },
  "demo-lie-detector": {
    id: "demo-lie-detector",
    title: "Детектор лжи",
    description: "Распознавание манипуляций, когнитивные искажения, критический анализ аргументов. Научись видеть правду сквозь ложь.",
    branch: "LOGIC",
    durationDays: 10,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 10 }, (_, i) => ({ day: i + 1, cardCount: 5 })),
  },
  "demo-encyclopedist": {
    id: "demo-encyclopedist",
    title: "Энциклопедист",
    description: "Широкий кругозор: наука, история, философия, искусство. Стань человеком-библиотекой. Каждый день — новая область знаний.",
    branch: "ERUDITION",
    durationDays: 10,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 10 }, (_, i) => ({ day: i + 1, cardCount: 6 })),
  },
  "demo-orator": {
    id: "demo-orator",
    title: "Оратор",
    description: "Структура речи, сторителлинг, работа с возражениями. Говори так, чтобы слушали. Практические техники убеждения.",
    branch: "RHETORIC",
    durationDays: 10,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 10 }, (_, i) => ({ day: i + 1, cardCount: 5 })),
  },
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, token: string | null): Promise<T | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function postJson<T>(url: string, token: string | null): Promise<T | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { method: "POST", headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-light/60 ${className}`} />;
}

function BranchBadge({ branch }: { branch: string }) {
  const color = BRANCH_COLORS[branch] ?? "#888";
  const label = BRANCH_LABELS[branch] ?? branch;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function DayCard({
  day,
  cardCount,
  status,
  color,
}: {
  day: number;
  cardCount: number;
  status: "completed" | "current" | "upcoming" | "locked";
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        status === "current"
          ? "border-white/[0.1] bg-surface-light/60"
          : status === "completed"
            ? "border-white/[0.05] bg-surface/60"
            : "border-white/[0.03] bg-surface/30 opacity-60"
      }`}
    >
      {/* Day number indicator */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={
          status === "completed"
            ? { background: `${color}20`, color }
            : status === "current"
              ? {
                  background: `${color}25`,
                  color,
                  boxShadow: `0 0 12px ${color}30`,
                  border: `1px solid ${color}40`,
                }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)" }
        }
      >
        {status === "completed" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          day
        )}
      </div>

      {/* Day info */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            status === "locked" ? "text-text-muted" : "text-text-primary"
          }`}
        >
          День {day}
        </p>
        <p className="text-xs text-text-muted">
          {cardCount} {cardCount === 1 ? "карточка" : cardCount < 5 ? "карточки" : "карточек"}
        </p>
      </div>

      {/* Status icon */}
      {status === "current" && (
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
      )}
      {status === "locked" && (
        <svg className="w-4 h-4 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuth();

  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);
      setError(false);

      const data = await fetchJson<CampaignDetail | { data: CampaignDetail }>(
        `${API_BASE}/campaigns/${campaignId}`,
        accessToken,
      );

      if (!data) {
        // Fallback to demo data when API is not available
        const demo = DEMO_CAMPAIGNS[campaignId];
        if (demo) {
          setCampaign(demo);
        } else {
          setError(true);
        }
        setLoading(false);
        return;
      }

      const detail = "data" in data && data.data ? data.data : (data as CampaignDetail);
      setCampaign(detail);
      setLoading(false);
    }

    load();
  }, [campaignId, accessToken, authLoading]);

  async function handleStart() {
    if (starting) return;
    setStarting(true);

    const result = await postJson<{ success?: boolean }>(
      `${API_BASE}/campaigns/${campaignId}/start`,
      accessToken,
    );

    if (result) {
      // Refresh campaign data to reflect started state
      const updated = await fetchJson<CampaignDetail | { data: CampaignDetail }>(
        `${API_BASE}/campaigns/${campaignId}`,
        accessToken,
      );
      if (updated) {
        const detail = "data" in updated && updated.data ? updated.data : (updated as CampaignDetail);
        setCampaign(detail);
      }
    }

    setStarting(false);
  }

  const color = campaign ? (BRANCH_COLORS[campaign.branch] ?? "#888") : "#888";
  const isStarted = campaign?.started;
  const isCompleted = (campaign?.progress ?? 0) >= 100;
  const currentDay = campaign?.currentDay ?? 0;

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-6">
        {/* Back button */}
        <Skeleton className="w-8 h-8 rounded-lg" />
        {/* Title */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        {/* Duration */}
        <Skeleton className="h-5 w-24" />
        {/* Days */}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        {/* CTA */}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error || !campaign) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-6">
        <button
          onClick={() => router.push("/campaigns")}
          className="w-8 h-8 rounded-lg bg-surface-light/50 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <Card padding="lg" className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-red/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Кампания не найдена</p>
            <p className="text-xs text-text-muted mt-1">Возможно, она была удалена или перемещена</p>
          </div>
          <button
            onClick={() => router.push("/campaigns")}
            className="text-sm text-accent font-medium hover:underline"
          >
            Вернуться к списку
          </button>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Build days list (fill from API data or generate placeholders)
  // ---------------------------------------------------------------------------

  const days: CampaignDay[] =
    campaign.days && campaign.days.length > 0
      ? campaign.days
      : Array.from({ length: campaign.durationDays }, (_, i) => ({
          day: i + 1,
          cardCount: 5,
          completed: false,
        }));

  function getDayStatus(day: CampaignDay): "completed" | "current" | "upcoming" | "locked" {
    if (!isStarted) return "locked";
    if (day.completed) return "completed";
    if (day.day === currentDay) return "current";
    if (day.day < currentDay) return "completed";
    return "upcoming";
  }

  const completedCount = days.filter(
    (d) => d.completed || (isStarted && d.day < currentDay),
  ).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/campaigns")}
        className="w-8 h-8 rounded-lg bg-surface-light/50 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Campaign Title — metallic gradient */}
      <div className="space-y-3">
        <h1
          className="text-2xl font-bold"
          style={{
            background: "linear-gradient(135deg, #E8D5B7, #CF9D7B, #B8860B)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {campaign.title}
        </h1>

        {/* Branch badge */}
        <BranchBadge branch={campaign.branch} />

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed">
          {campaign.description}
        </p>
      </div>

      {/* Duration & progress meta */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm text-text-muted">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {campaign.durationDays} дней
        </span>

        {isStarted && (
          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            {completedCount} / {days.length} дней
          </span>
        )}
      </div>

      {/* Overall progress bar (if started) */}
      {isStarted && !isCompleted && (
        <Card padding="sm" className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Прогресс кампании</span>
            <span className="font-semibold" style={{ color }}>
              {campaign.progress ?? Math.round((completedCount / days.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${campaign.progress ?? Math.round((completedCount / days.length) * 100)}%`,
                background: `linear-gradient(90deg, ${color}99, ${color})`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Completed banner */}
      {isCompleted && (
        <Card
          padding="md"
          className="text-center space-y-2"
          style={{ borderColor: `${color}30` } as React.CSSProperties}
        >
          <div
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
            style={{ background: `${color}20` }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-text-primary">Кампания завершена!</p>
          <p className="text-xs text-text-muted">Все дни пройдены. Отличная работа, воин!</p>
        </Card>
      )}

      {/* Stats (visible when campaign is started) */}
      {isStarted && (
        <div className="grid grid-cols-3 gap-3">
          <Card padding="sm" className="text-center space-y-1">
            <p className="text-lg font-bold" style={{ color }}>
              {completedCount * 25}
            </p>
            <p className="text-[11px] text-text-muted">XP заработано</p>
          </Card>
          <Card padding="sm" className="text-center space-y-1">
            <p className="text-lg font-bold text-text-primary">
              {completedCount * 8}<span className="text-xs text-text-muted ml-0.5">мин</span>
            </p>
            <p className="text-[11px] text-text-muted">Время</p>
          </Card>
          <Card padding="sm" className="text-center space-y-1">
            <p className="text-lg font-bold text-text-primary">
              {completedCount > 0 ? Math.min(98, 78 + completedCount * 2) : 0}%
            </p>
            <p className="text-[11px] text-text-muted">Точность</p>
          </Card>
        </div>
      )}

      {/* Day-by-day preview */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-text-primary">План кампании</h2>
        <div className="space-y-2">
          {days.map((day) => (
            <DayCard
              key={day.day}
              day={day.day}
              cardCount={day.cardCount}
              status={getDayStatus(day)}
              color={color}
            />
          ))}
        </div>
      </section>

      {/* CTA Button */}
      <div className="sticky bottom-20 pt-4">
        {!isStarted && (
          <Button
            fullWidth
            disabled={starting}
            onClick={handleStart}
            className="!py-3.5 !text-base !font-bold"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}CC)`,
              boxShadow: `0 4px 24px ${color}40`,
            } as React.CSSProperties}
          >
            {starting ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Запуск...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 20h14v-2H5v2zm7-18l-2 6H6l4 3-1.5 5h7L14 11l4-3h-4L12 2z" />
                </svg>
                Начать кампанию
              </span>
            )}
          </Button>
        )}

        {isStarted && !isCompleted && (
          <Button
            fullWidth
            onClick={() => router.push("/feed")}
            className="!py-3.5 !text-base !font-bold"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}CC)`,
              boxShadow: `0 4px 24px ${color}40`,
            } as React.CSSProperties}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              Продолжить - День {currentDay}
            </span>
          </Button>
        )}

        {isCompleted && (
          <Button
            fullWidth
            variant="secondary"
            onClick={() => router.push("/campaigns")}
            className="!py-3.5 !text-base"
          >
            Вернуться к кампаниям
          </Button>
        )}
      </div>
    </div>
  );
}
