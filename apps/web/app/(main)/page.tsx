"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  streak: 0,
  battles: 0,
  winRate: 0,
  rank: "---",
  xp: 0,
  level: 1,
  xpToNextLevel: 3000,
};

export default function HomePage() {
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();

  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [fact, setFact] = useState<FactOfDay | null>(null);
  const [warmupDone, setWarmupDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);

      const [userData, factData, warmupData] = await Promise.all([
        isAuthenticated
          ? fetchJson<UserStats>(`${API_BASE}/v1/users/me`, accessToken)
          : null,
        fetchJson<FactOfDay>(`${API_BASE}/v1/facts/today`, accessToken),
        isAuthenticated
          ? fetchJson<WarmupStatus>(`${API_BASE}/v1/warmup/today`, accessToken)
          : null,
      ]);

      if (userData) {
        setStats({
          streak: userData.streak ?? 0,
          battles: userData.battles ?? 0,
          winRate: userData.winRate ?? 0,
          rank: userData.rank ?? "---",
          xp: userData.xp ?? 0,
          level: userData.level ?? 1,
          xpToNextLevel: userData.xpToNextLevel ?? 3000,
        });
      }

      if (factData) setFact(factData);
      if (warmupData) setWarmupDone(warmupData.completedToday);

      setLoading(false);
    }

    load();
  }, [accessToken, isAuthenticated, authLoading]);

  const xpMax = stats.xpToNextLevel || 3000;

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-accent tracking-wider">
          РАЗУМ
        </h1>
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

      {/* Fact of the Day */}
      {fact && (
        <Card className="relative overflow-hidden border-l-[3px] border-l-accent-gold">
          <div className="space-y-2">
            <p className="text-text-muted text-xs tracking-widest uppercase">Факт дня</p>
            <p className="text-text-primary text-sm leading-relaxed">{fact.text}</p>
            {fact.source && (
              <p className="text-text-muted text-xs">Источник: {fact.source}</p>
            )}
          </div>
        </Card>
      )}

      {/* Daily Warmup — secondary style with red tag */}
      <Card className="relative overflow-hidden border-l-[3px] border-l-accent-red">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-warm/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.38 0 2.5 1.12 2.5 2.5S4.88 15.8 3.5 15.8H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
              </svg>
            </div>
            <h2 className="font-bold text-lg text-text-primary">
              Ежедневная разминка
            </h2>
          </div>
          <p className="text-text-secondary text-sm">
            5 вопросов на логику и мышление
          </p>
          {warmupDone ? (
            <div className="w-full py-3 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/15 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Выполнено сегодня
            </div>
          ) : (
            <Link href="/warmup">
              <button className="w-full py-3 rounded-xl text-sm font-semibold bg-accent-warm/15 text-accent hover:bg-accent-warm/25 transition-all active:scale-95 border border-accent/15">
                Начать разминку
              </button>
            </Link>
          )}
        </div>
      </Card>

      {/* Battle CTA — primary, bright gradient + glow */}
      <Link href="/battle/new" className="block mt-4">
        <Card className="relative overflow-hidden group cursor-pointer hover:border-accent/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-warm/20 via-surface to-surface" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="relative space-y-3">
            <h2 className="font-semibold text-[17px] text-text-primary">
              Интеллект-баттл
            </h2>
            <p className="text-text-secondary text-sm">
              Сразись с соперником в 5 раундах
            </p>
            <Button fullWidth>В бой</Button>
          </div>
        </Card>
      </Link>

      {/* Stats */}
      {isAuthenticated && (
        <div>
          <p className="text-text-muted text-xs tracking-widest mb-3">
            Статистика
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <Card padding="sm">
              {loading ? (
                <Skeleton className="w-12 h-8" />
              ) : (
                <p className="text-[26px] font-bold text-accent">
                  {stats.battles}
                </p>
              )}
              <p className="text-text-secondary text-xs mt-1">Баттлов</p>
            </Card>
            <Card padding="sm">
              {loading ? (
                <Skeleton className="w-12 h-8" />
              ) : (
                <p className="text-[26px] font-bold text-accent-gold">
                  {stats.winRate}%
                </p>
              )}
              <p className="text-text-secondary text-xs mt-1">Побед</p>
            </Card>
            <Card padding="sm">
              {loading ? (
                <Skeleton className="w-12 h-8" />
              ) : (
                <p className="text-[24px] font-bold text-accent">
                  Lvl {stats.level}
                </p>
              )}
              <p className="text-text-secondary text-xs mt-1">Уровень</p>
              <div className="w-[60px] h-[3px] rounded-full bg-gradient-to-r from-accent to-transparent mt-1" />
            </Card>
            <Card padding="sm">
              {loading ? (
                <Skeleton className="w-16 h-8" />
              ) : (
                <p className="text-xl font-bold text-accent-gold">
                  {stats.rank}
                </p>
              )}
              <p className="text-text-secondary text-xs mt-1">Класс</p>
            </Card>
          </div>
        </div>
      )}

      {/* XP Progress */}
      {isAuthenticated && (
        <div>
          <p className="text-text-muted text-xs tracking-widest mb-3">
            Прогресс
          </p>
          <Card padding="sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Опыт</span>
              {loading ? (
                <Skeleton className="w-20 h-4" />
              ) : (
                <span className="text-xs text-text-muted">
                  {stats.xp} / {xpMax} XP
                </span>
              )}
            </div>
            <div className="h-2.5 bg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-warm via-accent to-accent-gold rounded-full transition-all shadow-[0_2px_8px_rgba(207,157,123,0.3)]"
                style={{ width: `${(stats.xp / xpMax) * 100}%` }}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
