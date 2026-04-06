"use client";

import Card from "@/components/ui/Card";

const mockProfile = {
  name: "Игрок",
  thinkerClass: "Стратег",
  avatar: null,
  stats: {
    strategy: 78,
    philosophy: 62,
    logic: 85,
    rhetoric: 55,
    erudition: 70,
  },
  battles: [
    { id: 1, opponent: "LogicMaster", result: "win", score: "3:2", date: "Сегодня" },
    { id: 2, opponent: "PhiloKing", result: "loss", score: "1:4", date: "Вчера" },
    { id: 3, opponent: "BrainStorm", result: "win", score: "4:1", date: "2 дня назад" },
    { id: 4, opponent: "MindForge", result: "win", score: "3:2", date: "3 дня назад" },
  ],
};

const statConfig = [
  { key: "strategy", label: "Стратегия", color: "text-accent", bg: "bg-accent" },
  { key: "philosophy", label: "Философия", color: "text-accent-gold", bg: "bg-accent-gold" },
  { key: "logic", label: "Логика", color: "text-accent", bg: "bg-accent" },
  { key: "rhetoric", label: "Риторика", color: "text-accent-gold", bg: "bg-accent-gold" },
  { key: "erudition", label: "Эрудиция", color: "text-accent-warm", bg: "bg-accent-warm" },
] as const;

export default function ProfilePage() {
  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
          И
        </div>
        <div>
          <h1 className="text-xl font-bold">{mockProfile.name}</h1>
          <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-accent-red/20 text-accent-red text-xs font-semibold">
            {mockProfile.thinkerClass}
          </span>
        </div>
      </div>

      {/* Radar Chart Placeholder - Stats Bars */}
      <Card padding="lg" className="space-y-4">
        <h2 className="font-semibold text-sm text-text-secondary uppercase tracking-wider">
          Навыки мышления
        </h2>
        {statConfig.map(({ key, label, color, bg }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${color}`}>{label}</span>
              <span className="text-sm text-text-secondary">
                {mockProfile.stats[key]}
              </span>
            </div>
            <div className="h-2 bg-surface-light rounded-full overflow-hidden">
              <div
                className={`h-full ${bg} rounded-full transition-all`}
                style={{ width: `${mockProfile.stats[key]}%` }}
              />
            </div>
          </div>
        ))}
      </Card>

      {/* Battle History */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-text-secondary uppercase tracking-wider px-1">
          История батлов
        </h2>
        {mockProfile.battles.map((battle) => (
          <Card key={battle.id} padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    battle.result === "win"
                      ? "bg-accent-gold/20 text-accent-gold"
                      : "bg-accent-red/20 text-accent-red"
                  }`}
                >
                  {battle.result === "win" ? "W" : "L"}
                </div>
                <div>
                  <p className="text-sm font-medium">{battle.opponent}</p>
                  <p className="text-xs text-text-muted">{battle.date}</p>
                </div>
              </div>
              <span className="text-sm font-mono text-text-secondary">{battle.score}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
