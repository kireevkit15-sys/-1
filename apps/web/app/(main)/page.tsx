"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import SwipeToDismiss from "@/components/ui/SwipeToDismiss";
import { API_BASE } from "@/lib/api/base";
import { BRANCHES as BRANCH_META } from "@/lib/branches";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserStats {
  streak: number;
  battles: number;
  winRate: number;
  rank: string;
  xp: number;
  level: number;
  xpToNextLevel: number;
  strategyXp: number;
  logicXp: number;
  eruditionXp: number;
  rhetoricXp: number;
  intuitionXp: number;
  name: string;
}

interface FactOfDay {
  id: string;
  text: string;
  source: string;
  category: string;
}

interface WarmupStatus {
  completedToday: boolean;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(
  url: string,
  token: string | null,
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-light ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Defaults (shown when not logged in or API unavailable)
// ---------------------------------------------------------------------------

const defaultStats: UserStats = {
  streak: 7,
  battles: 23,
  winRate: 65,
  rank: "Стратег",
  xp: 1850,
  level: 4,
  xpToNextLevel: 3000,
  strategyXp: 500,
  logicXp: 500,
  eruditionXp: 500,
  rhetoricXp: 500,
  intuitionXp: 500,
  name: "Воин",
};

const DEMO_MODE = true; // TODO: убрать после подключения API

// ---------------------------------------------------------------------------
// Branch bars config — метки и цвета тянем из общего lib/branches.ts,
// здесь только маппинг key → поле UserStats.
// ---------------------------------------------------------------------------

const HERO_BRANCHES = [
  { xpKey: "strategyXp",  ...BRANCH_META.STRATEGY },
  { xpKey: "logicXp",     ...BRANCH_META.LOGIC },
  { xpKey: "eruditionXp", ...BRANCH_META.ERUDITION },
  { xpKey: "rhetoricXp",  ...BRANCH_META.RHETORIC },
  { xpKey: "intuitionXp", ...BRANCH_META.INTUITION },
] as const;

const MAX_BRANCH_XP = 1000;

// ---------------------------------------------------------------------------
// Countdown hook — seconds to midnight
// ---------------------------------------------------------------------------

function useCountdown(): string {
  const [timeLeft, setTimeLeft] = useState("--:--:--");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const { accessToken, isAuthenticated: realAuth, isLoading: authLoading } = useAuth();
  const isAuthenticated = realAuth || DEMO_MODE;

  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [fact, setFact] = useState<FactOfDay | null>(
    DEMO_MODE
      ? {
          id: "demo",
          text: "Шахматисты мирового уровня могут удерживать в памяти до 100 000 позиций. Это не врождённый талант — а результат тренировки паттернового мышления.",
          source: "Cognitive Science Journal",
          category: "Стратегия",
        }
      : null,
  );
  const [warmupDone, setWarmupDone] = useState(false);
  const [loading, setLoading] = useState(!DEMO_MODE);

  const countdown = useCountdown();

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);

      const [userData, factData, warmupData] = await Promise.all([
        isAuthenticated
          ? fetchJson<UserStats>(`${API_BASE}/users/me`, accessToken)
          : null,
        fetchJson<FactOfDay>(`${API_BASE}/facts/today`, accessToken),
        isAuthenticated
          ? fetchJson<WarmupStatus>(`${API_BASE}/warmup/today`, accessToken)
          : null,
      ]);

      if (userData) {
        setStats({
          streak:        userData.streak        ?? 0,
          battles:       userData.battles       ?? 0,
          winRate:       userData.winRate       ?? 0,
          rank:          userData.rank          ?? "---",
          xp:            userData.xp            ?? 0,
          level:         userData.level         ?? 1,
          xpToNextLevel: userData.xpToNextLevel ?? 3000,
          strategyXp:    userData.strategyXp    ?? 500,
          logicXp:       userData.logicXp       ?? 500,
          eruditionXp:   userData.eruditionXp   ?? 500,
          rhetoricXp:    userData.rhetoricXp    ?? 500,
          intuitionXp:   userData.intuitionXp   ?? 500,
          name:          userData.name          ?? "Воин",
        });
      }

      if (factData) setFact(factData);
      if (warmupData) setWarmupDone(warmupData.completedToday);

      setLoading(false);
    }

    load();
  }, [accessToken, isAuthenticated, authLoading]);

  const xpMax = stats.xpToNextLevel || 3000;
  const xpPct = Math.min(100, Math.round((stats.xp / xpMax) * 100));

  // Initials from name
  const initials = stats.name
    ? stats.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "ВН";

  return (
    <div className="px-4 pt-10 pb-28 space-y-5 max-w-lg mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="h1 text-metallic !tracking-[0.12em]">
          РАЗУМ
        </h1>

        <div className="flex items-center gap-3">
          {!isAuthenticated && !authLoading && (
            <Link
              href="/login"
              className="px-4 py-2 rounded-full bg-accent text-background text-sm font-semibold hover:bg-accent/90 transition-all active:scale-95"
            >
              Войти
            </Link>
          )}
          <div className="flex items-center gap-2 bg-gradient-to-r from-accent-warm/30 to-surface rounded-full px-3.5 py-2 border border-accent/20 shadow-[0_0_12px_rgba(185,141,52,0.15)]">
            <svg
              className="w-5 h-5 text-accent-gold drop-shadow-[0_0_8px_rgba(185,141,52,0.8)]"
              viewBox="0 0 14 18"
              fill="currentColor"
            >
              <path d="M 7 0 C 7 0 10 4 10 4 C 12 6 14 8 14 11 C 14 15 11 18 7 18 C 3 18 0 15 0 11 C 0 8 2 6 4 4 C 4 4 4 7 5.5 8 C 5.5 8 7 0 7 0 Z" />
            </svg>
            {loading ? (
              <Skeleton className="w-5 h-4" />
            ) : (
              <span className="text-sm font-bold text-accent-gold">
                {stats.streak}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Hero section ───────────────────────────────────────── */}
      <div className="glass-card p-4 flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white"
            style={{
              background: "linear-gradient(135deg, #CF9D7B 0%, #B98D34 60%, #9A7A2F 100%)",
              boxShadow: "0 0 24px rgba(207,157,123,0.35), 0 0 60px rgba(207,157,123,0.1)",
            }}
          >
            {initials}
          </div>
          {/* Level badge */}
          <div
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-accent flex items-center justify-center text-xs font-bold text-accent"
          >
            {stats.level}
          </div>
        </div>

        {/* Name + rank + branch bars */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base text-text-primary truncate">
            {loading ? <Skeleton className="w-24 h-4" /> : stats.name}
          </div>
          <div className="overline text-accent mb-3">
            {loading ? <Skeleton className="w-16 h-3 mt-1" /> : stats.rank}
          </div>

          {/* 5 branch mini-bars */}
          <div className="space-y-1.5">
            {HERO_BRANCHES.map(({ xpKey, label, color }) => {
              const val = stats[xpKey as keyof UserStats] as number;
              const pct = Math.min(100, Math.round((val / MAX_BRANCH_XP) * 100));
              return (
                <div key={xpKey} className="flex items-center gap-2">
                  {/* Branch-label — исключение из шкалы: 10px uppercase-ритуал.
                      Русские uppercase-слова (СТРАТЕГИЯ, ЭРУДИЦИЯ) в 12px
                      не помещаются в правую колонку hero-карточки на 375px.
                      Тот же паттерн применяется в components/learning/*. */}
                  <span
                    className="text-[10px] font-semibold w-14 shrink-0 uppercase tracking-wide"
                    style={{ color }}
                  >
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: color,
                        boxShadow: `0 0 6px ${color}80`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted w-6 text-right shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CTA "В бой" ─────────────────────────────────────────── */}
      <Link href="/battle/new" className="block">
        <button className="cta-battle w-full text-center tracking-widest uppercase">
          В бой
        </button>
      </Link>

      {/* ── Stats 2×2 grid ──────────────────────────────────────── */}
      {isAuthenticated && (
        <div>
          <h2 className="overline mb-2.5">Статистика</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Battles */}
            <div className="glass-card p-4">
              {loading ? (
                <Skeleton className="w-12 h-8 mb-1" />
              ) : (
                <p className="text-3xl font-black text-accent leading-none">
                  {stats.battles}
                </p>
              )}
              <p className="caption mt-1">Баттлов</p>
            </div>

            {/* Win rate */}
            <div className="glass-card p-4">
              {loading ? (
                <Skeleton className="w-12 h-8 mb-1" />
              ) : (
                <p className="text-3xl font-black text-accent-gold leading-none">
                  {stats.winRate}%
                </p>
              )}
              <p className="caption mt-1">Победы</p>
            </div>

            {/* Level */}
            <div className="glass-card p-4">
              {loading ? (
                <Skeleton className="w-12 h-8 mb-1" />
              ) : (
                <p className="text-3xl font-black text-accent leading-none">
                  {stats.level}
                </p>
              )}
              <p className="caption mt-1">Уровень</p>
              <div className="w-full h-[3px] rounded-full bg-white/5 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-warm to-accent"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>

            {/* Rank */}
            <div className="glass-card p-4">
              {loading ? (
                <Skeleton className="w-16 h-8 mb-1" />
              ) : (
                <p className="text-xl font-bold text-accent-gold leading-none">
                  {stats.rank}
                </p>
              )}
              <p className="caption mt-1">Класс</p>
            </div>
          </div>
        </div>
      )}

      {/* ── XP Progress bar ─────────────────────────────────────── */}
      {isAuthenticated && (
        <div className="glass-card card-flush-top p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="overline text-text-secondary">Опыт</span>
            {loading ? (
              <Skeleton className="w-20 h-3" />
            ) : (
              <span className="text-xs text-text-muted">
                {stats.xp.toLocaleString("ru-RU")} / {xpMax.toLocaleString("ru-RU")} XP
              </span>
            )}
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${xpPct}%`,
                background: "linear-gradient(90deg, #CF9D7B 0%, #B98D34 50%, #E8C89E 100%)",
                boxShadow: "0 0 10px rgba(207,157,123,0.4)",
              }}
            />
          </div>
          <p className="text-xs text-text-muted mt-1.5 text-right">
            {xpPct}% до следующего уровня
          </p>
        </div>
      )}

      {/* ── Daily challenge card ─────────────────────────────────── */}
      <div className="glass-card card-flush-top p-4 border-l-[3px] border-l-accent-gold overflow-hidden relative">
        {/* Glow accent */}
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(185,141,52,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="overline mb-1">Ежедневный вызов</p>
          <p className="font-bold text-sm text-text-primary mb-3">
            Пройди разминку до конца дня
          </p>

          {/* Countdown */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-accent-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-xs text-text-muted">Сброс через</span>
            </div>
            <span className="text-lg font-black tabular-nums tracking-widest text-accent-gold">
              {countdown}
            </span>
          </div>

          {/* Warmup button */}
          {warmupDone ? (
            <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/20 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Выполнено сегодня
            </div>
          ) : (
            <Link href="/warmup" className="block">
              <button className="w-full py-2.5 rounded-xl text-sm font-semibold bg-accent-warm/15 text-accent hover:bg-accent-warm/25 transition-all active:scale-95 border border-accent/15">
                Начать разминку
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Fact of the Day ─────────────────────────────────────── */}
      {fact && (
        <SwipeToDismiss storageKey="razum_fact_dismissed" threshold={100}>
          <div className="glass-card p-4 border-l-[3px] border-l-accent pt-6">
            <p className="overline mb-2">Факт дня · {fact.category}</p>
            <p className="text-text-primary text-sm leading-relaxed">{fact.text}</p>
            {fact.source && (
              <p className="text-xs text-text-muted mt-2">
                Источник: {fact.source}
              </p>
            )}
          </div>
        </SwipeToDismiss>
      )}
    </div>
  );
}
