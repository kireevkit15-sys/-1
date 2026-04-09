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
  isMe?: boolean;
}

interface MyPosition {
  rank: number;
  rating: number;
  username?: string;
  level?: number;
  thinkerClass?: string;
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

const DEMO_MY_POS: MyPosition = { rank: 42, rating: 1180, username: "Ты", level: 7, thinkerClass: "Логик" };

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

// Crown icons for top 3
function CrownIcon({ rank }: { rank: number }) {
  const color =
    rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32";
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={color}
      className="absolute -top-2 -right-1"
    >
      <path d="M5 16L2 6l5 4 5-8 5 8 5-4-3 10H5z" />
    </svg>
  );
}

function getInitials(username: string): string {
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? "") + (parts[1][0] ?? "")).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

function AvatarCircle({ username, isMe }: { username: string; isMe?: boolean }) {
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        isMe
          ? "bg-accent/20 border-2 border-accent/60"
          : "bg-surface-light border border-accent/10"
      }`}
    >
      <span className={`text-xs font-bold ${isMe ? "text-accent" : "text-text-secondary"}`}>
        {getInitials(username)}
      </span>
    </div>
  );
}

interface LeaderRowProps {
  player: LeaderEntry;
  rank: number;
  isMe?: boolean;
}

function LeaderRow({ player, rank, isMe }: LeaderRowProps) {
  const isTop3 = rank <= 3;

  const rowClass = isMe
    ? "border border-accent/40 shadow-[0_0_20px_rgba(207,157,123,0.12)] bg-accent/5"
    : isTop3
      ? "border border-accent/15"
      : "";

  return (
    <Card padding="sm" className={`glass-card ${rowClass}`}>
      <div className="flex items-center gap-3">
        {/* Rank number */}
        <div className="relative w-8 flex-shrink-0 flex items-center justify-center">
          <span
            className={`font-black tabular-nums leading-none ${
              rank === 1
                ? "text-xl text-[#FFD700]"
                : rank === 2
                  ? "text-xl text-[#C0C0C0]"
                  : rank === 3
                    ? "text-xl text-[#CD7F32]"
                    : "text-base text-text-muted"
            }`}
          >
            {rank}
          </span>
          {isTop3 && <CrownIcon rank={rank} />}
        </div>

        {/* Avatar */}
        <AvatarCircle username={player.username} isMe={isMe} />

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isMe ? "text-accent" : "text-text-primary"}`}>
            {player.username}
            {isMe && <span className="ml-1 text-xs font-normal text-accent/70">(ты)</span>}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Lvl {player.level}</span>
            {player.thinkerClass && (
              <span className={`text-xs font-medium ${classColors[player.thinkerClass] ?? "text-text-muted"}`}>
                {player.thinkerClass}
              </span>
            )}
          </div>
        </div>

        {/* Rating */}
        <span className={`text-sm font-bold tabular-nums ${isMe ? "text-accent" : "text-accent"}`}>
          {player.rating}
        </span>
      </div>
    </Card>
  );
}

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

  // Determine if current player is already in top list
  const myRankInList = myPosition
    ? leaders.findIndex((l) => l.isMe === true || l.id === "me")
    : -1;
  const showMyRowAtBottom =
    myPosition !== null && myRankInList === -1 && myPosition.rank > leaders.length;

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

      {/* My position summary card */}
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
          {leaders.map((player, i) => (
            <LeaderRow
              key={player.id}
              player={player}
              rank={i + 1}
              isMe={player.isMe}
            />
          ))}

          {/* Separator + current player row if outside top list */}
          {showMyRowAtBottom && myPosition && (
            <>
              <div className="flex items-center gap-3 py-2 px-1">
                <div className="flex-1 border-t border-dashed border-surface-light" />
                <span className="text-xs text-text-muted font-mono">···</span>
                <div className="flex-1 border-t border-dashed border-surface-light" />
              </div>
              <LeaderRow
                player={{
                  id: "me",
                  username: myPosition.username ?? "Ты",
                  rating: myPosition.rating,
                  level: myPosition.level ?? 1,
                  totalXp: 0,
                  thinkerClass: myPosition.thinkerClass,
                }}
                rank={myPosition.rank}
                isMe
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
