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
    <div className="px-4 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">РАЗУМ</h1>
          <p className="text-white/40 text-sm">Добро пожаловать</p>
        </div>
        <div className="flex items-center gap-2 bg-surface rounded-full px-3 py-1.5">
          <span className="text-accent-gold text-lg">🔥</span>
          <span className="text-sm font-semibold">{mockStats.streak} дней</span>
        </div>
      </div>

      {/* Daily Warmup */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-accent-purple/10" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h2 className="font-semibold">Ежедневная разминка</h2>
          </div>
          <p className="text-white/50 text-sm">
            5 вопросов на логику и критическое мышление. Не теряй серию!
          </p>
          <Button fullWidth>Начать разминку</Button>
        </div>
      </Card>

      {/* Battle CTA */}
      <Link href="/battle/new">
        <Card className="relative overflow-hidden group cursor-pointer hover:border-accent-red/30 transition-colors mt-4">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-red/10 to-accent-gold/5" />
          <div className="relative flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg">Интеллект-батл</h2>
              <p className="text-white/50 text-sm">
                Сразись с соперником в 5 раундах
              </p>
            </div>
            <div className="text-4xl group-hover:scale-110 transition-transform">
              &#9889;
            </div>
          </div>
        </Card>
      </Link>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="text-center space-y-1">
          <p className="text-2xl font-bold text-accent-blue">{mockStats.battles}</p>
          <p className="text-white/40 text-xs">Батлов</p>
        </Card>
        <Card padding="sm" className="text-center space-y-1">
          <p className="text-2xl font-bold text-accent-green">{mockStats.winRate}%</p>
          <p className="text-white/40 text-xs">Побед</p>
        </Card>
        <Card padding="sm" className="text-center space-y-1">
          <p className="text-2xl font-bold text-accent-purple">Lvl {mockStats.level}</p>
          <p className="text-white/40 text-xs">Уровень</p>
        </Card>
        <Card padding="sm" className="text-center space-y-1">
          <p className="text-2xl font-bold text-accent-gold">{mockStats.rank}</p>
          <p className="text-white/40 text-xs">Класс</p>
        </Card>
      </div>

      {/* XP Progress */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Опыт</span>
          <span className="text-xs text-white/40">{mockStats.xp} / 3000 XP</span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-purple rounded-full transition-all"
            style={{ width: `${(mockStats.xp / 3000) * 100}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
