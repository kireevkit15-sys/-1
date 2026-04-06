"use client";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Link from "next/link";

const mockStats = {
  streak: 7,
  battles: 42,
  winRate: 68,
  rank: "Стратег",
  xp: 2450,
  level: 12,
};

export default function HomePage() {
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
          <span className="text-sm font-bold text-accent-gold">
            {mockStats.streak}
          </span>
        </div>
      </div>

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
          <button className="w-full py-3 rounded-xl text-sm font-semibold bg-accent-warm/15 text-accent hover:bg-accent-warm/25 transition-all active:scale-95 border border-accent/15">
            Начать разминку
          </button>
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
      <div>
        <p className="text-text-muted text-xs tracking-widest mb-3">
          Статистика
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <Card padding="sm">
            <p className="text-[26px] font-bold text-accent">
              {mockStats.battles}
            </p>
            <p className="text-text-secondary text-xs mt-1">Баттлов</p>
          </Card>
          <Card padding="sm">
            <p className="text-[26px] font-bold text-accent-gold">
              {mockStats.winRate}%
            </p>
            <p className="text-text-secondary text-xs mt-1">Побед</p>
          </Card>
          <Card padding="sm">
            <p className="text-[24px] font-bold text-accent">
              Lvl {mockStats.level}
            </p>
            <p className="text-text-secondary text-xs mt-1">Уровень</p>
            <div className="w-[60px] h-[3px] rounded-full bg-gradient-to-r from-accent to-transparent mt-1" />
          </Card>
          <Card padding="sm">
            <p className="text-xl font-bold text-accent-gold">
              {mockStats.rank}
            </p>
            <p className="text-text-secondary text-xs mt-1">Класс</p>
          </Card>
        </div>
      </div>

      {/* XP Progress */}
      <div>
        <p className="text-text-muted text-xs tracking-widest mb-3">
          Прогресс
        </p>
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Опыт</span>
            <span className="text-xs text-text-muted">
              {mockStats.xp} / 3000 XP
            </span>
          </div>
          <div className="h-2.5 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-warm via-accent to-accent-gold rounded-full transition-all shadow-[0_2px_8px_rgba(207,157,123,0.3)]"
              style={{ width: `${(mockStats.xp / 3000) * 100}%` }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
