"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

interface QuickStats {
  streak: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  winRate: number;
  rank: string;
}

interface FactOfDay {
  id: string;
  text: string;
  source: string;
  category: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const defaultStats: QuickStats = {
  streak: 7,
  level: 4,
  xp: 1850,
  xpToNextLevel: 3000,
  winRate: 65,
  rank: "Стратег",
};

const defaultFact: FactOfDay = {
  id: "demo",
  text: "Шахматисты мирового уровня могут удерживать в памяти до 100 000 позиций. Это не врождённый талант — а результат тренировки паттернового мышления.",
  source: "Cognitive Science Journal",
  category: "Стратегия",
};

export default function RightSidebar() {
  const { accessToken, isAuthenticated: realAuth } = useAuth();
  const [stats, setStats] = useState<QuickStats>(defaultStats);
  const [fact, setFact] = useState<FactOfDay>(defaultFact);

  useEffect(() => {
    if (!realAuth || !accessToken) return;

    async function load() {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        };
        const [userRes, factRes] = await Promise.all([
          fetch(`${API_BASE}/v1/users/me`, { headers }),
          fetch(`${API_BASE}/v1/facts/today`, { headers }),
        ]);
        if (userRes.ok) {
          const u = await userRes.json();
          setStats({
            streak: u.streak ?? 0,
            level: u.level ?? 1,
            xp: u.xp ?? 0,
            xpToNextLevel: u.xpToNextLevel ?? 3000,
            winRate: u.winRate ?? 0,
            rank: u.rank ?? "---",
          });
        }
        if (factRes.ok) {
          const f = await factRes.json();
          setFact(f);
        }
      } catch {
        // keep defaults
      }
    }

    load();
  }, [accessToken, realAuth]);

  const xpPercent = Math.min((stats.xp / (stats.xpToNextLevel || 3000)) * 100, 100);

  return (
    <aside className="hidden lg:block fixed right-0 top-0 bottom-0 w-[260px] border-l border-accent/8 bg-surface/30 backdrop-blur-sm overflow-y-auto z-30">
      <div className="px-5 pt-8 space-y-5">
        {/* Streak + Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-accent-gold drop-shadow-[0_0_6px_rgba(185,141,52,0.6)]"
              viewBox="0 0 14 18"
              fill="currentColor"
            >
              <path d="M 7 0 C 7 0 10 4 10 4 C 12 6 14 8 14 11 C 14 15 11 18 7 18 C 3 18 0 15 0 11 C 0 8 2 6 4 4 C 4 4 4 7 5.5 8 C 5.5 8 7 0 7 0 Z" />
            </svg>
            <span className="text-sm font-bold text-accent-gold">{stats.streak} дн.</span>
          </div>
          <span className="text-xs text-text-muted">Lvl {stats.level}</span>
        </div>

        {/* XP bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">Опыт</span>
            <span className="text-xs text-text-muted">{stats.xp} / {stats.xpToNextLevel}</span>
          </div>
          <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-warm via-accent to-accent-gold rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <Card padding="sm">
            <p className="text-lg font-bold text-accent">{stats.winRate}%</p>
            <p className="text-[10px] text-text-muted mt-0.5">Винрейт</p>
          </Card>
          <Card padding="sm">
            <p className="text-lg font-bold text-accent-gold">{stats.rank}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Класс</p>
          </Card>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />

        {/* Fact of the day */}
        <div>
          <p className="text-[10px] text-text-muted tracking-widest uppercase mb-2">Факт дня</p>
          <Card className="border-l-2 border-l-accent-gold">
            <p className="text-xs text-text-primary leading-relaxed">{fact.text}</p>
            {fact.source && (
              <p className="text-[10px] text-text-muted mt-2">{fact.source}</p>
            )}
          </Card>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />

        {/* Quick links */}
        <div>
          <p className="text-[10px] text-text-muted tracking-widest uppercase mb-2">Быстрые действия</p>
          <div className="space-y-1.5">
            <a href="/warmup" className="flex items-center gap-2 text-xs text-text-secondary hover:text-accent transition-colors py-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.38 0 2.5 1.12 2.5 2.5S4.88 15.8 3.5 15.8H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
              </svg>
              Ежедневная разминка
            </a>
            <a href="/battle/new" className="flex items-center gap-2 text-xs text-text-secondary hover:text-accent transition-colors py-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Начать баттл
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
