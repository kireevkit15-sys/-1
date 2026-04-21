"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE } from "@/lib/api/base";
import { BRANCHES } from "@/lib/branches";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignDay {
  day: number;
  cardCount: number;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  branch: string;
  durationDays: number;
  days?: CampaignDay[];
  requiredRank?: string;
  requiredXp?: number;
  /** User-specific fields (present when authenticated) */
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

interface RankInfo {
  key: string;
  label: string;
  threshold: number;
}

const RANKS: RankInfo[] = [
  { key: "NOVICE", label: "Новобранец", threshold: 0 },
  { key: "WARRIOR", label: "Воин", threshold: 500 },
  { key: "GLADIATOR", label: "Гладиатор", threshold: 2000 },
  { key: "STRATEGIST", label: "Стратег", threshold: 5000 },
  { key: "SPARTAN", label: "Спартанец", threshold: 15000 },
];

function getRankForXp(xp: number): { current: RankInfo; next: RankInfo | null; progressPercent: number } {
  let currentIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i]!.threshold) {
      currentIdx = i;
      break;
    }
  }
  const current = RANKS[currentIdx]!;
  const next = RANKS[currentIdx + 1] ?? null;
  let progressPercent = 100;
  if (next) {
    const range = next.threshold - current.threshold;
    progressPercent = Math.min(100, Math.round(((xp - current.threshold) / range) * 100));
  }
  return { current, next, progressPercent };
}

function getRankIndex(rankKey: string): number {
  return RANKS.findIndex((r) => r.key === rankKey);
}

// ---------------------------------------------------------------------------
// Demo data (shown when API is not available)
// ---------------------------------------------------------------------------

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "demo-first-principles",
    title: "Первые принципы",
    description: "Научись мыслить с нуля: декомпозиция, аналогии, инверсия. Фундамент стратегического мышления.",
    branch: "STRATEGY",
    durationDays: 7,
    requiredRank: "NOVICE",
    days: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, cardCount: 5 })),
  },
  {
    id: "demo-logic-basics",
    title: "Основы логики",
    description: "Дедукция, индукция, логические ошибки. Построй непробиваемую аргументацию.",
    branch: "LOGIC",
    durationDays: 7,
    requiredRank: "NOVICE",
    days: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, cardCount: 5 })),
  },
  {
    id: "demo-negotiator",
    title: "Переговорщик",
    description: "Стратегии переговоров, BATNA, якорение, управление уступками. Побеждай за столом переговоров.",
    branch: "STRATEGY",
    durationDays: 12,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 12 }, (_, i) => ({ day: i + 1, cardCount: 6 })),
  },
  {
    id: "demo-lie-detector",
    title: "Детектор лжи",
    description: "Распознавание манипуляций, когнитивные искажения, критический анализ аргументов.",
    branch: "LOGIC",
    durationDays: 10,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 10 }, (_, i) => ({ day: i + 1, cardCount: 5 })),
  },
  {
    id: "demo-encyclopedist",
    title: "Энциклопедист",
    description: "Широкий кругозор: наука, история, философия, искусство. Стань человеком-библиотекой.",
    branch: "ERUDITION",
    durationDays: 10,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 10 }, (_, i) => ({ day: i + 1, cardCount: 6 })),
  },
  {
    id: "demo-orator",
    title: "Оратор",
    description: "Структура речи, сторителлинг, работа с возражениями. Говори так, чтобы слушали.",
    branch: "RHETORIC",
    durationDays: 10,
    requiredRank: "WARRIOR",
    days: Array.from({ length: 10 }, (_, i) => ({ day: i + 1, cardCount: 5 })),
  },
];

// ---------------------------------------------------------------------------
// API helper
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-light/60 ${className}`} />;
}

function CampaignCardSkeleton() {
  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
    </Card>
  );
}

function BranchBadge({ branch }: { branch: string }) {
  const color = BRANCH_COLORS[branch] ?? "#888";
  const label = BRANCH_LABELS[branch] ?? branch;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function BranchIcon({ branch, className = "w-5 h-5" }: { branch: string; className?: string }) {
  const color = BRANCH_COLORS[branch] ?? "#888";
  switch (branch) {
    case "STRATEGY":
      return (
        <svg className={className} viewBox="0 0 24 24" fill={color}>
          <path d="M5 20h14v-2H5v2zm7-18l-2 6H6l4 3-1.5 5h7L14 11l4-3h-4L12 2z" />
        </svg>
      );
    case "LOGIC":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
          <circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" />
          <circle cx="5" cy="18" r="2" /><circle cx="19" cy="18" r="2" />
          <circle cx="12" cy="12" r="2.5" />
          <line x1="7" y1="6" x2="10" y2="11" /><line x1="17" y1="6" x2="14" y2="11" />
          <line x1="7" y1="18" x2="10" y2="13" /><line x1="17" y1="18" x2="14" y2="13" />
        </svg>
      );
    case "ERUDITION":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.5 5 8 4.5 5 5v14c3-.5 5.5 0 7 1.5 1.5-1.5 4-2 7-1.5V5c-3-.5-5.5 0-7 1.5z" />
          <line x1="12" y1="6.5" x2="12" y2="20" />
        </svg>
      );
    case "RHETORIC":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "INTUITION":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return null;
  }
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${progress}%`, background: color }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign Card
// ---------------------------------------------------------------------------

function CampaignCard({ campaign, locked }: { campaign: Campaign; locked: boolean }) {
  const color = BRANCH_COLORS[campaign.branch] ?? "#888";
  const isStarted = campaign.started && (campaign.progress ?? 0) > 0;
  const isCompleted = (campaign.progress ?? 0) >= 100;

  return (
    <Link
      href={locked ? "#" : `/campaigns/${campaign.id}`}
      className={locked ? "pointer-events-none" : ""}
    >
      <Card
        padding="md"
        className={`space-y-3 transition-all duration-200 ${
          locked
            ? "opacity-50"
            : "hover:border-white/[0.1] hover:-translate-y-0.5 cursor-pointer"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}25`,
            }}
          >
            {locked ? (
              <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : (
              <BranchIcon branch={campaign.branch} />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {campaign.title}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
              {campaign.description}
            </p>
          </div>

          {/* Status indicator */}
          {isCompleted && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}20` }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Progress bar for started campaigns */}
        {isStarted && !isCompleted && (
          <ProgressBar progress={campaign.progress ?? 0} color={color} />
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <BranchBadge branch={campaign.branch} />
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {campaign.durationDays} дней
          </span>
          {isStarted && !isCompleted && (
            <span className="text-[11px] font-medium" style={{ color }}>
              День {campaign.currentDay ?? 1} / {campaign.durationDays}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { accessToken, isLoading: authLoading } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userXp, setUserXp] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);
      setError(false);

      const data = await fetchJson<Campaign[] | { data: Campaign[] }>(
        `${API_BASE}/campaigns`,
        accessToken,
      );

      if (!data) {
        // Fallback to demo data when API is not available
        setCampaigns(DEMO_CAMPAIGNS);
        setLoading(false);
        return;
      }

      const list = Array.isArray(data) ? data : data.data;
      setCampaigns(list.length > 0 ? list : DEMO_CAMPAIGNS);
      setLoading(false);
    }

    // Attempt to get user XP from session or a stats endpoint
    async function loadXp() {
      const stats = await fetchJson<{ xp?: number; totalXp?: number; warriorXp?: number }>(
        `${API_BASE}/users/me/stats`,
        accessToken,
      );
      if (stats) {
        setUserXp(stats.warriorXp ?? stats.totalXp ?? stats.xp ?? 0);
      }
    }

    load();
    if (accessToken) loadXp();
  }, [accessToken, authLoading]);

  const { current: currentRank, next: nextRank, progressPercent } = getRankForXp(userXp);
  const currentRankIdx = getRankIndex(currentRank.key);

  // Split campaigns into active vs grouped by rank
  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.started && (c.progress ?? 0) < 100),
    [campaigns],
  );

  const campaignsByRank = useMemo(() => {
    const groups: Record<string, Campaign[]> = {};
    for (const rank of RANKS) {
      groups[rank.key] = [];
    }
    for (const c of campaigns) {
      if (c.started && (c.progress ?? 0) < 100) continue; // skip active ones
      const rankKey = c.requiredRank ?? "NOVICE";
      if (groups[rankKey]) {
        groups[rankKey]!.push(c);
      } else {
        groups["NOVICE"]!.push(c);
      }
    }
    return groups;
  }, [campaigns]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="px-4 pt-12 pb-24 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(192, 57, 43, 0.12)",
            border: "1px solid rgba(192, 57, 43, 0.25)",
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="rgba(192, 57, 43, 1)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
            <line x1="13" y1="19" x2="19" y2="13" />
            <line x1="16" y1="16" x2="20" y2="20" />
            <line x1="19" y1="21" x2="21" y2="19" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-metallic">Кампании</h1>
          <p className="text-text-muted text-sm">Путь воина к вершинам знаний</p>
        </div>
      </div>

      {/* Warrior Rank Card */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Rank shield icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(207,157,123,0.2), rgba(207,157,123,0.05))",
                border: "1px solid rgba(207,157,123,0.3)",
              }}
            >
              <svg className="w-5 h-5 text-metallic" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-muted">Текущий ранг</p>
              <p className="text-sm font-bold text-metallic">{currentRank.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-metallic">{userXp.toLocaleString("ru-RU")}</p>
            <p className="text-[11px] text-text-muted">XP</p>
          </div>
        </div>

        {/* XP progress to next rank */}
        {nextRank && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">До ранга «{nextRank.label}»</span>
              <span className="text-text-secondary font-medium">
                {(nextRank.threshold - userXp).toLocaleString("ru-RU")} XP
              </span>
            </div>
            <div className="h-2 bg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, rgba(207,157,123,0.6), rgba(207,157,123,1))",
                }}
              />
            </div>
          </div>
        )}

        {!nextRank && (
          <p className="text-xs text-text-secondary text-center font-medium">
            Максимальный ранг достигнут
          </p>
        )}
      </Card>

      {/* Rank Progression Bar */}
      <div className="flex items-center gap-0">
        {RANKS.map((rank, idx) => {
          const isActive = idx <= currentRankIdx;
          const isLast = idx === RANKS.length - 1;
          return (
            <div key={rank.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    isActive
                      ? "border-metallic/40 text-metallic"
                      : "border-white/[0.08] text-text-muted"
                  }`}
                  style={
                    isActive
                      ? { background: "rgba(207,157,123,0.15)" }
                      : { background: "rgba(255,255,255,0.03)" }
                  }
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-[9px] whitespace-nowrap ${
                    isActive ? "text-metallic font-semibold" : "text-text-muted"
                  }`}
                >
                  {rank.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mx-1 rounded-full"
                  style={{
                    background:
                      idx < currentRankIdx
                        ? "rgba(207,157,123,0.5)"
                        : "rgba(255,255,255,0.06)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card padding="lg" className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-red/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Не удалось загрузить кампании</p>
            <p className="text-xs text-text-muted mt-1">Проверьте соединение и попробуйте снова</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-accent font-medium hover:underline"
          >
            Обновить страницу
          </button>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && campaigns.length === 0 && (
        <Card padding="lg" className="text-center space-y-4 py-12">
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(192, 57, 43, 0.1)",
              border: "1px solid rgba(192, 57, 43, 0.2)",
            }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="rgba(192, 57, 43, 0.8)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
              <line x1="13" y1="19" x2="19" y2="13" />
              <line x1="16" y1="16" x2="20" y2="20" />
              <line x1="19" y1="21" x2="21" y2="19" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Кампании скоро появятся</p>
            <p className="text-xs text-text-muted mt-1">Мы готовим эпические походы за знаниями</p>
          </div>
        </Card>
      )}

      {/* Active Campaigns */}
      {!loading && !error && activeCampaigns.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-bold text-text-primary">Активные кампании</h2>
          </div>
          <div className="space-y-3">
            {activeCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} locked={false} />
            ))}
          </div>
        </section>
      )}

      {/* Campaigns grouped by rank */}
      {!loading && !error && campaigns.length > 0 && (
        <>
          {RANKS.map((rank, rankIdx) => {
            const rankCampaigns = campaignsByRank[rank.key] ?? [];
            if (rankCampaigns.length === 0) return null;

            const isLocked = rankIdx > currentRankIdx;

            return (
              <section key={rank.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isLocked ? (
                      <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-metallic" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                      </svg>
                    )}
                    <h2 className={`text-base font-bold ${isLocked ? "text-text-muted" : "text-text-primary"}`}>
                      {rank.label}
                    </h2>
                  </div>
                  {isLocked && (
                    <span className="text-[11px] text-text-muted">
                      {rank.threshold.toLocaleString("ru-RU")} XP
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {rankCampaigns.map((c) => (
                    <CampaignCard key={c.id} campaign={c} locked={isLocked} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
