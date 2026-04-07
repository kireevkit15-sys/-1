"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

type Period = "all" | "week" | "month";

interface LeaderEntry {
  id: string;
  username: string;
  rating: number;
  level: number;
  totalXp: number;
  thinkerClass?: string;
}

interface MyPosition {
  rank: number;
  rating: number;
}

const DEMO_LEADERS: LeaderEntry[] = [
  { id: "1", username: "StrategicMind", rating: 1580, level: 18, totalXp: 12400, thinkerClass: "Стратег" },
  { id: "2", username: "LogicKing", rating: 1520, level: 16, totalXp: 10800, thinkerClass: "Логик" },
  { id: "3", username: "Thinker42", rating: 1490, level: 15, totalXp: 9600, thinkerClass: "Эрудит" },
  { id: "4", username: "BrainPower", rating: 1450, level: 14, totalXp: 8900, thinkerClass: "Ритор" },
  { id: "5", username: "MindForge", rating: 1410, level: 13, totalXp: 7800, thinkerClass: "Интуит" },
  { id: "6", username: "DeepThought", rating: 1390, level: 12, totalXp: 7200, thinkerClass: "Стратег" },
  { id: "7", username: "CriticalEye", rating: 1370, level: 12, totalXp: 6900, thinkerClass: "Логик" },
  { id: "8", username: "Dialectic", rating: 1350, level: 11, totalXp: 6500, thinkerClass: "Эрудит" },
  { id: "9", username: "Paradoxer", rating: 1330, level: 11, totalXp: 6100, thinkerClass: "Ритор" },
  { id: "10", username: "NashPlayer", rating: 1310, level: 10, totalXp: 5800, thinkerClass: "Стратег" },
];

const DEMO_MY_POS: MyPosition = { rank: 42, rating: 1180 };

const periodLabels: Record<Period, string> = {
  all: "Все время",
  week: "Неделя",
  month: "Месяц",
};

const classColors: Record<string, string> = {
  "Стратег": "text-accent-red",
  "Логик": "text-accent-gold",
  "Эрудит": "text-accent",
  "Ритор": "text-accent-silver",
  "Интуит": "text-accent-bronze",
};

export default function LeaderboardPage() {
  const token = useApiToken();
  const [period, setPeriod] = useState<Period>("all");
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [myPosition, setMyPosition] = useState<MyPosition | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [leadRes, myRes] = await Promise.allSettled([
        fetch(`${API_BASE}/stats/leaderboard?type=rating&period=${period}&limit=20`, { headers }),
        fetch(`${API_BASE}/stats/leaderboard/me?type=rating&period=${period}`, { headers }),
      ]);

      if (leadRes.status === "fulfilled" && leadRes.value.ok) {
        const data = await leadRes.value.json();
        setLeaders(Array.isArray(data) ? data : []);
      } else {
        setLeaders(DEMO_LEADERS);
      }

      if (myRes.status === "fulfilled" && myRes.value.ok) {
        setMyPosition(await myRes.value.json());
      } else {
        setMyPosition(DEMO_MY_POS);
      }
    } catch {
      setLeaders(DEMO_LEADERS);
      setMyPosition(DEMO_MY_POS);
    }
    setLoading(false);
  }, [period, token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Лидерборд</h1>
        <p className="text-text-muted text-sm mt-1">Топ игроков по рейтингу</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 border border-accent/10">
        {(["all", "month", "week"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              period === p
                ? "bg-accent text-background shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* My position */}
      {myPosition && (
        <Card padding="md" className="border-accent/20 bg-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                #{myPosition.rank}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Твоя позиция</p>
                <p className="text-xs text-text-muted">Рейтинг: {myPosition.rating}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Leaders list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {leaders.map((player, i) => {
            const isTop3 = i < 3;
            return (
              <Card
                key={player.id}
                padding="sm"
                className={isTop3 ? "border-accent/15" : ""}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-accent-gold/20 text-accent-gold"
                        : i === 1
                          ? "bg-accent-silver/20 text-accent-silver"
                          : i === 2
                            ? "bg-accent-bronze/20 text-accent-bronze"
                            : "bg-surface-light text-text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>

                  {/* Avatar initials */}
                  <div className="w-9 h-9 rounded-full bg-surface-light border border-accent/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-text-secondary">
                      {player.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {player.username}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Lvl {player.level}</span>
                      {player.thinkerClass && (
                        <span className={`text-xs font-medium ${classColors[player.thinkerClass] || "text-text-muted"}`}>
                          {player.thinkerClass}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-sm font-bold text-accent tabular-nums">
                    {player.rating}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
