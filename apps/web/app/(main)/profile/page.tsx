"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  stats: {
    level: number;
    rating: number;
    totalXp: number;
    logicXp: number;
    strategyXp: number;
    eruditionXp: number;
    rhetoricXp: number;
    intuitionXp: number;
    battlesPlayed: number;
    battlesWon: number;
    winRate: number;
    streakDays: number;
    thinkerClass: string;
  };
}

// ---------------------------------------------------------------------------
// Radar config
// ---------------------------------------------------------------------------

const radarKeys = [
  { key: "strategyXp", label: "Стратегия" },
  { key: "logicXp", label: "Логика" },
  { key: "eruditionXp", label: "Эрудиция" },
  { key: "rhetoricXp", label: "Риторика" },
  { key: "intuitionXp", label: "Интуиция" },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/v1/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        const data: UserProfile = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [accessToken, authLoading]);

  // ── Not authenticated ──────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="px-4 pt-24 pb-24 text-center space-y-4">
        <p className="text-text-secondary text-lg">Войдите в аккаунт</p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm"
        >
          Войти
        </Link>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────
  if (loading || authLoading) {
    return (
      <div className="px-4 pt-12 pb-24 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-light animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-surface-light animate-pulse" />
            <div className="h-4 w-24 rounded bg-surface-light animate-pulse" />
          </div>
        </div>
        <div className="h-16 rounded-2xl bg-surface-light animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface-light animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-surface-light animate-pulse" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────
  if (error || !profile) {
    return (
      <div className="px-4 pt-24 pb-24 text-center space-y-4">
        <p className="text-accent-red text-lg">{error ?? "Профиль не найден"}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-surface-light text-text-secondary font-semibold text-sm"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────
  const { stats } = profile;

  // XP progress: estimate current/required from totalXp and level
  // Level formula: each level = level * 1000 XP threshold
  const xpForCurrentLevel = stats.level * 1000;
  const xpForNextLevel = (stats.level + 1) * 1000;
  const xpCurrent = stats.totalXp - (xpForCurrentLevel > 0 ? xpForCurrentLevel - 1000 : 0);
  const xpRequired = xpForNextLevel - (xpForCurrentLevel > 0 ? xpForCurrentLevel - 1000 : 0);

  const xpPct =
    xpRequired > 0
      ? Math.min(100, Math.round((xpCurrent / xpRequired) * 100))
      : 0;

  const radarData = radarKeys.map(({ key, label }) => ({
    stat: label,
    value: stats[key],
  }));

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/15">
          <span className="text-accent text-2xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-semibold border border-accent-gold/20">
              Ур. {stats.level}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline-block mr-1 -mt-0.5">
                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
              </svg>
              {stats.rating}
            </span>
          </div>
        </div>
      </div>

      {/* ── XP Progress ──────────────────────────────── */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary">
            До уровня {stats.level + 1}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {xpCurrent} / {xpRequired} XP
          </span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-warm via-accent to-accent-gold transition-all duration-500"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </Card>

      {/* ── Battle Stats Row ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent font-mono">{stats.battlesPlayed}</p>
          <p className="text-xs text-text-muted mt-0.5">Баттлов</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent-gold font-mono">{stats.battlesWon}</p>
          <p className="text-xs text-text-muted mt-0.5">Побед</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent font-mono">{Math.round(stats.winRate)}%</p>
          <p className="text-xs text-text-muted mt-0.5">Винрейт</p>
        </Card>
      </div>

      {/* ── Streak ───────────────────────────────────── */}
      {stats.streakDays > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-accent-gold">
                <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
              </svg>
              <span className="text-sm text-text-secondary">Серия дней</span>
            </div>
            <span className="text-lg font-bold text-accent-gold font-mono">
              {stats.streakDays}
            </span>
          </div>
        </Card>
      )}

      {/* ── Thinker Class ────────────────────────────── */}
      {stats.thinkerClass && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Класс мыслителя</span>
            <span className="text-sm font-semibold text-accent">{stats.thinkerClass}</span>
          </div>
        </Card>
      )}

      {/* ── Radar Chart ──────────────────────────────── */}
      <Card padding="lg" className="space-y-3">
        <h2 className="font-semibold text-sm text-text-secondary uppercase tracking-wider">
          Навыки мышления
        </h2>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="rgba(207,157,123,0.12)" />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fill: "#87756A", fontSize: 12 }}
              />
              <Radar
                dataKey="value"
                stroke="#CF9D7B"
                fill="#CF9D7B"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {/* XP per stat */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
          {radarKeys.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{label}</span>
              <span className="text-xs text-text-secondary font-mono">
                {stats[key]} XP
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
