"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import ShareButton from "@/components/profile/ShareButton";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

// ---------------------------------------------------------------------------
// Fallback data — used when API unavailable
// ---------------------------------------------------------------------------

const mockProfile = {
  name: "Игрок",
  avatarUrl: null as string | null,
  createdAt: "2026-04-01T00:00:00Z",
  stats: {
    strategyXp: 780,
    logicXp: 1250,
    rhetoricXp: 420,
    eruditionXp: 650,
    intuitionXp: 310,
    rating: 1247,
    streakDays: 5,
    totalXp: 3410,
    level: 5,
    xpProgress: { current: 810, required: 1100 },
  },
  battleStats: { total: 34, wins: 21, losses: 13, winRate: 62 },
  recentBattles: [
    { id: "1", opponent: { id: "a", name: "LogicMaster", avatarUrl: null }, myScore: 3, opponentScore: 2, won: true, endedAt: "2026-04-07T14:00:00Z" },
    { id: "2", opponent: { id: "b", name: "PhiloKing", avatarUrl: null }, myScore: 1, opponentScore: 4, won: false, endedAt: "2026-04-06T18:00:00Z" },
    { id: "3", opponent: { id: "c", name: "BrainStorm", avatarUrl: null }, myScore: 4, opponentScore: 1, won: true, endedAt: "2026-04-06T10:00:00Z" },
    { id: "4", opponent: { id: "d", name: "MindForge", avatarUrl: null }, myScore: 3, opponentScore: 2, won: true, endedAt: "2026-04-05T20:00:00Z" },
    { id: "5", opponent: { id: "e", name: "Strategist", avatarUrl: null }, myScore: 2, opponentScore: 3, won: false, endedAt: "2026-04-05T12:00:00Z" },
    { id: "6", opponent: { id: "bot", name: "РАЗУМ-бот", avatarUrl: null }, myScore: 4, opponentScore: 0, won: true, endedAt: "2026-04-04T16:00:00Z" },
    { id: "7", opponent: { id: "f", name: "QuizNinja", avatarUrl: null }, myScore: 2, opponentScore: 3, won: false, endedAt: "2026-04-04T09:00:00Z" },
    { id: "8", opponent: { id: "g", name: "DeepThink", avatarUrl: null }, myScore: 3, opponentScore: 1, won: true, endedAt: "2026-04-03T21:00:00Z" },
    { id: "9", opponent: { id: "h", name: "RhetorPro", avatarUrl: null }, myScore: 0, opponentScore: 4, won: false, endedAt: "2026-04-03T14:00:00Z" },
    { id: "10", opponent: { id: "i", name: "WiseOwl", avatarUrl: null }, myScore: 4, opponentScore: 2, won: true, endedAt: "2026-04-02T17:00:00Z" },
  ],
};

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
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const token = useApiToken();
  const [profile, setProfile] = useState(mockProfile);

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile((prev) => ({
            ...prev,
            name: data.username || data.name || prev.name,
            avatarUrl: data.avatarUrl || prev.avatarUrl,
            stats: {
              ...prev.stats,
              ...(data.stats || {}),
              rating: data.stats?.rating ?? prev.stats.rating,
              totalXp: data.stats?.totalXp ?? prev.stats.totalXp,
              level: data.stats?.level ?? prev.stats.level,
              streakDays: data.stats?.streakDays ?? prev.stats.streakDays,
            },
          }));
        }
      } catch {}
    }
    fetchProfile();
  }, [token]);

  const { stats, battleStats, recentBattles } = profile;

  const radarData = useMemo(
    () =>
      radarKeys.map(({ key, label }) => ({
        stat: label,
        value: stats[key],
      })),
    [stats],
  );

  const xpPct =
    stats.xpProgress.required > 0
      ? Math.min(100, Math.round((stats.xpProgress.current / stats.xpProgress.required) * 100))
      : 0;

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
        <ShareButton
          username={profile.name}
          level={stats.level}
          thinkerClass="Стратег"
        />
      </div>

      {/* ── XP Progress ──────────────────────────────── */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary">
            До уровня {stats.level + 1}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {stats.xpProgress.current} / {stats.xpProgress.required} XP
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
          <p className="text-2xl font-bold text-accent font-mono">{battleStats.total}</p>
          <p className="text-xs text-text-muted mt-0.5">Баттлов</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent-gold font-mono">{battleStats.wins}</p>
          <p className="text-xs text-text-muted mt-0.5">Побед</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-accent font-mono">{battleStats.winRate}%</p>
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

      {/* ── Battle History ────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-text-secondary uppercase tracking-wider px-1">
          Последние баттлы
        </h2>
        {recentBattles.map((b) => (
          <Card key={b.id} padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    b.won
                      ? "bg-accent-gold/20 text-accent-gold"
                      : "bg-accent-red/20 text-accent-red"
                  }`}
                >
                  {b.won ? "W" : "L"}
                </div>
                <div>
                  <p className="text-sm font-medium">{b.opponent.name}</p>
                  <p className="text-xs text-text-muted">
                    {formatRelativeDate(b.endedAt)}
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-mono ${b.won ? "text-accent" : "text-accent-red"}`}
              >
                {b.myScore}:{b.opponentScore}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
