"use client";

import { useEffect, useRef, useState } from "react";
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
import { API_BASE } from "@/lib/api/base";

// ---------------------------------------------------------------------------
// Hook: animated counter (requestAnimationFrame)
// ---------------------------------------------------------------------------

function useAnimatedCounter(target: number, duration = 1000): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      startTimeRef.current = null;
    };
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Battle history types + demo data
// ---------------------------------------------------------------------------

type BattleResult = "win" | "loss" | "draw";

interface BattleHistoryEntry {
  id: string;
  opponentName: string;
  result: BattleResult;
  branch: string;
  ratingChange: number;
  date: string;
}

const DEMO_BATTLES: BattleHistoryEntry[] = [
  { id: "1", opponentName: "Сократ",    result: "win",  branch: "Логика",    ratingChange: +18, date: "2026-04-09" },
  { id: "2", opponentName: "Платон",    result: "loss", branch: "Стратегия", ratingChange: -12, date: "2026-04-08" },
  { id: "3", opponentName: "Аристотель",result: "win",  branch: "Эрудиция",  ratingChange: +21, date: "2026-04-07" },
  { id: "4", opponentName: "Декарт",    result: "draw", branch: "Риторика",  ratingChange:   0, date: "2026-04-06" },
  { id: "5", opponentName: "Кант",      result: "loss", branch: "Интуиция",  ratingChange: -9,  date: "2026-04-05" },
];

const resultStyle: Record<BattleResult, { label: string; borderColor: string; textColor: string }> = {
  win:  { label: "Победа",   borderColor: "#22C55E", textColor: "text-green-400"  },
  loss: { label: "Поражение",borderColor: "#C0392B", textColor: "text-accent-red" },
  draw: { label: "Ничья",    borderColor: "#56453A", textColor: "text-text-muted" },
};

function BattleHistorySection({ token }: { token: string | null }) {
  const [battles, setBattles] = useState<BattleHistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setHistLoading(true);
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/battles/history`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data: BattleHistoryEntry[] = await res.json();
            if (!cancelled) setBattles(data.slice(0, 10));
            return;
          }
        } catch {
          // fall through to demo
        }
      }
      if (!cancelled) setBattles(DEMO_BATTLES);
    }

    load().finally(() => { if (!cancelled) setHistLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <Card padding="lg" className="space-y-3">
      <h2 className="overline text-text-secondary">История баттлов</h2>

      {histLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-light animate-pulse" />
          ))}
        </div>
      ) : battles.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">Баттлов пока нет</p>
      ) : (
        <div className="space-y-2">
          {battles.map((b) => {
            const rs = resultStyle[b.result];
            return (
              <div
                key={b.id}
                className="glass-card flex items-center gap-3 px-3 py-2.5"
                style={{ borderLeft: `3px solid ${rs.borderColor}` }}
              >
                {/* Opponent */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{b.opponentName}</p>
                  <p className="text-xs text-text-muted">{b.branch}</p>
                </div>

                {/* Result */}
                <span className={`text-xs font-bold ${rs.textColor} shrink-0`}>
                  {rs.label}
                </span>

                {/* Rating change */}
                <span
                  className={`text-xs font-mono font-semibold shrink-0 w-10 text-right ${
                    b.ratingChange > 0
                      ? "text-green-400"
                      : b.ratingChange < 0
                      ? "text-accent-red"
                      : "text-text-muted"
                  }`}
                >
                  {b.ratingChange > 0 ? `+${b.ratingChange}` : b.ratingChange === 0 ? "±0" : b.ratingChange}
                </span>

                {/* Date */}
                <span className="text-xs text-text-muted shrink-0 hidden sm:block">
                  {new Date(b.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

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
  { key: "strategyXp",  label: "Стратегия", color: "#06B6D4", branch: "branch-strategy"  },
  { key: "logicXp",     label: "Логика",    color: "#22C55E", branch: "branch-logic"      },
  { key: "eruditionXp", label: "Эрудиция",  color: "#A855F7", branch: "branch-erudition"  },
  { key: "rhetoricXp",  label: "Риторика",  color: "#F97316", branch: "branch-rhetoric"   },
  { key: "intuitionXp", label: "Интуиция",  color: "#EC4899", branch: "branch-intuition"  },
] as const;

// Map label → branch color for the PolarAngleAxis custom tick
const labelColorMap: Record<string, string> = {
  "Стратегия": "#06B6D4",
  "Логика":    "#22C55E",
  "Эрудиция":  "#A855F7",
  "Риторика":  "#F97316",
  "Интуиция":  "#EC4899",
};

// Custom tick renderer for the RadarChart axis labels
function ColoredTick(props: {
  x?: number; y?: number; payload?: { value: string };
  textAnchor?: "start" | "middle" | "end" | "inherit";
}) {
  const { x = 0, y = 0, payload, textAnchor } = props;
  const label = payload?.value ?? "";
  const color = labelColorMap[label] ?? "#87756A";
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={color}
      fontSize={11}
      fontWeight={600}
    >
      {label}
    </text>
  );
}

// Crown SVG icon for rank badge
function CrownIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 text-accent-gold shrink-0"
      aria-hidden="true"
    >
      <path d="M10 2L12.5 8H18L13.5 11.5L15.5 18L10 14.5L4.5 18L6.5 11.5L2 8H7.5L10 2Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Profile content (sub-component so hooks are always called unconditionally)
// ---------------------------------------------------------------------------

function ProfileContent({ profile, token, logout }: { profile: UserProfile; token: string | null; logout: () => void }) {
  const { stats } = profile;

  // ── Animated counters (always called, no early returns above) ──
  const animBattlesPlayed = useAnimatedCounter(stats.battlesPlayed, 900);
  const animBattlesWon    = useAnimatedCounter(stats.battlesWon, 900);
  const animWinRate       = useAnimatedCounter(Math.round(stats.winRate), 900);
  const animRating        = useAnimatedCounter(stats.rating, 1000);

  // ── XP progress ────────────────────────────────────
  const xpForCurrentLevel = stats.level * 1000;
  const xpForNextLevel    = (stats.level + 1) * 1000;
  const xpCurrent = stats.totalXp - (xpForCurrentLevel > 0 ? xpForCurrentLevel - 1000 : 0);
  const xpRequired = xpForNextLevel - (xpForCurrentLevel > 0 ? xpForCurrentLevel - 1000 : 0);
  const xpPct = xpRequired > 0 ? Math.min(100, Math.round((xpCurrent / xpRequired) * 100)) : 0;

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
          <h1 className="h3 font-bold truncate">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-semibold border border-accent-gold/20">
              Ур. {stats.level}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline-block mr-1 -mt-0.5">
                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
              </svg>
              {animRating}
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
          <p className="text-2xl font-bold text-accent font-mono">{animBattlesPlayed}</p>
          <p className="text-xs text-text-muted mt-0.5">Баттлов</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent-gold font-mono">{animBattlesWon}</p>
          <p className="text-xs text-text-muted mt-0.5">Побед</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent font-mono">{animWinRate}%</p>
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

      {/* ── Thinker Class (rank badge with glow) ─────── */}
      {stats.thinkerClass && (
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Класс мыслителя</span>
            <div className="rank-badge text-accent">
              <CrownIcon />
              {stats.thinkerClass}
            </div>
          </div>
        </Card>
      )}

      {/* ── Achievements link ─────────────────────────── */}
      <Link
        href="/achievements"
        className="block glass-card px-4 py-3 hover-lift"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-accent-gold">
              <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            <span className="text-sm font-semibold">Достижения</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-text-muted">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </Link>

      {/* ── Actions ────────────────────────────────── */}
      <div className="space-y-2">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-accent-red hover:border-accent-red/30 transition-all text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Выйти из аккаунта
        </button>
      </div>

      {/* ── Radar Chart ──────────────────────────────── */}
      <Card padding="lg" className="space-y-3">
        <h2 className="overline text-text-secondary">Навыки мышления</h2>
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="rgba(207,157,123,0.12)" />
              <PolarAngleAxis
                dataKey="stat"
                tick={ColoredTick}
              />
              <Radar
                dataKey="value"
                stroke="#CF9D7B"
                fill="#CF9D7B"
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* XP per stat — branch-colored */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
          {radarKeys.map(({ key, label, color, branch }) => (
            <div
              key={key}
              className={`flex items-center justify-between rounded-lg px-2 py-1 ${branch} branch-card`}
            >
              <span className="text-xs font-medium" style={{ color }}>
                {label}
              </span>
              <span className="text-xs font-mono font-semibold" style={{ color }}>
                {stats[key]} XP
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Battle History ────────────────────────────── */}
      <BattleHistorySection token={token} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { accessToken, isAuthenticated, isLoading: authLoading, logout } = useAuth();

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
        const res = await fetch(`${API_BASE}/users/me`, {
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

  return <ProfileContent profile={profile} token={accessToken} logout={logout} />;
}
