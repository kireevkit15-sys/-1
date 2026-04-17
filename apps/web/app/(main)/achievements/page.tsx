"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE } from "@/lib/api/base";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;            // SVG path data
  category: string;        // branch name or "general"
  unlocked: boolean;
  progress?: number;       // 0-100
  milestone?: string;      // e.g. "5/50 баттлов"
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    title: "Первая победа",
    description: "Выиграй свой первый баттл знаний",
    icon: "M5 3l14 9-14 9V3z",
    category: "general",
    unlocked: true,
    progress: 100,
  },
  {
    id: "strategist",
    title: "Стратег",
    description: "Победи в 10 баттлах по Стратегии",
    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
    category: "strategy",
    unlocked: true,
    progress: 100,
  },
  {
    id: "logician",
    title: "Логик",
    description: "Реши 25 задач по Логике без ошибок",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    category: "logic",
    unlocked: true,
    progress: 100,
  },
  {
    id: "erudite",
    title: "Эрудит",
    description: "Правильно ответь на 50 вопросов Эрудиции",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    category: "erudition",
    unlocked: false,
    progress: 62,
    milestone: "31/50 вопросов",
  },
  {
    id: "streak_5",
    title: "Серия побед",
    description: "Одержи 5 побед подряд",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    category: "general",
    unlocked: false,
    progress: 40,
    milestone: "2/5 побед",
  },
  {
    id: "veteran",
    title: "Ветеран",
    description: "Сыграй 50 баттлов",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    category: "general",
    unlocked: false,
    progress: 24,
    milestone: "12/50 баттлов",
  },
  {
    id: "sage",
    title: "Мудрец",
    description: "Достигни уровня 20",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    category: "general",
    unlocked: false,
    progress: 35,
    milestone: "Ур. 7 / 20",
  },
  {
    id: "polyglot",
    title: "Полиглот",
    description: "Победи в баттлах во всех 5 ветках знаний",
    icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
    category: "general",
    unlocked: false,
    progress: 60,
    milestone: "3/5 веток",
  },
];

// ---------------------------------------------------------------------------
// Branch color map
// ---------------------------------------------------------------------------

type CategoryKey = "strategy" | "logic" | "erudition" | "rhetoric" | "intuition" | "general";

const categoryColors: Record<CategoryKey, { color: string; glow: string; bg: string }> = {
  strategy:  { color: "#06B6D4", glow: "rgba(6,182,212,0.35)",   bg: "rgba(6,182,212,0.1)"   },
  logic:     { color: "#22C55E", glow: "rgba(34,197,94,0.35)",   bg: "rgba(34,197,94,0.1)"   },
  erudition: { color: "#A855F7", glow: "rgba(168,85,247,0.35)",  bg: "rgba(168,85,247,0.1)"  },
  rhetoric:  { color: "#F97316", glow: "rgba(249,115,22,0.35)",  bg: "rgba(249,115,22,0.1)"  },
  intuition: { color: "#EC4899", glow: "rgba(236,72,153,0.35)",  bg: "rgba(236,72,153,0.1)"  },
  general:   { color: "#CF9D7B", glow: "rgba(207,157,123,0.35)", bg: "rgba(207,157,123,0.1)" },
};

function getCategory(raw: string): CategoryKey {
  if (raw in categoryColors) return raw as CategoryKey;
  return "general";
}

// ---------------------------------------------------------------------------
// Badge component
// ---------------------------------------------------------------------------

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const cat = getCategory(achievement.category);
  const { color, glow, bg } = categoryColors[cat];

  return (
    <div
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 ${
        achievement.unlocked
          ? "animate-glow-pulse-badge"
          : "opacity-40 grayscale"
      }`}
      style={
        achievement.unlocked
          ? {
              background: bg,
              borderColor: `${color}40`,
              boxShadow: `0 0 20px ${glow}, 0 0 40px ${glow.replace("0.35", "0.08")}`,
            }
          : {
              background: "rgba(17,17,20,0.6)",
              borderColor: "rgba(255,255,255,0.05)",
            }
      }
    >
      {/* Lock overlay for locked achievements */}
      {!achievement.unlocked && (
        <div className="absolute top-2 right-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 text-text-muted"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
      )}

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={
          achievement.unlocked
            ? { background: bg, border: `1px solid ${color}40` }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={achievement.unlocked ? color : "#56453A"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d={achievement.icon} />
        </svg>
      </div>

      {/* Title */}
      <p
        className="text-xs font-bold text-center leading-tight"
        style={{ color: achievement.unlocked ? color : "#56453A" }}
      >
        {achievement.title}
      </p>

      {/* Progress bar (if locked and has progress) */}
      {!achievement.unlocked && achievement.progress !== undefined && achievement.progress > 0 && (
        <div className="w-full">
          <div className="h-1 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-muted transition-all"
              style={{ width: `${achievement.progress}%` }}
            />
          </div>
          {achievement.milestone && (
            <p className="text-[9px] text-text-muted text-center mt-1">{achievement.milestone}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next milestone progress bar
// ---------------------------------------------------------------------------

function NextMilestone({ achievements }: { achievements: Achievement[] }) {
  const locked = achievements.filter((a) => !a.unlocked && (a.progress ?? 0) > 0);
  if (locked.length === 0) return null;

  // Show the closest to completion
  const closest = locked.reduce((best, cur) =>
    (cur.progress ?? 0) > (best.progress ?? 0) ? cur : best
  );

  const cat = getCategory(closest.category);
  const { color } = categoryColors[cat];

  return (
    <Card padding="md" className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-secondary">Следующее достижение</p>
        <p className="text-xs text-text-muted font-mono">{closest.progress}%</p>
      </div>
      <p className="text-sm font-bold" style={{ color }}>{closest.title}</p>
      <div className="h-2 bg-surface-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${closest.progress}%`,
            background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
      {closest.milestone && (
        <p className="text-xs text-text-muted">{closest.milestone}</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AchievementsPage() {
  const { accessToken } = useAuth();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      if (accessToken) {
        try {
          const res = await fetch(`${API_BASE}/achievements`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data: Achievement[] = await res.json();
            if (!cancelled) {
              setAchievements(data);
              setLoading(false);
              return;
            }
          }
        } catch {
          // fall through to demo
        }
      }
      if (!cancelled) {
        setAchievements(DEMO_ACHIEVEMENTS);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accessToken]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Достижения</h1>
        <p className="text-sm text-text-secondary mt-1">
          {loading ? "Загрузка..." : `${unlockedCount} из ${totalCount} открыто`}
        </p>
      </div>

      {/* Overall progress */}
      {!loading && totalCount > 0 && (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">Общий прогресс</span>
            <span className="text-xs font-mono text-text-muted">
              {unlockedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((unlockedCount / totalCount) * 100)}%`,
                background: "linear-gradient(90deg, #CF9D7B 0%, #B98D34 100%)",
                boxShadow: "0 0 8px rgba(207,157,123,0.4)",
              }}
            />
          </div>
        </Card>
      )}

      {/* Next milestone */}
      {!loading && <NextMilestone achievements={achievements} />}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-surface-light animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Unlocked */}
          {unlockedCount > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Открыты
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {achievements
                  .filter((a) => a.unlocked)
                  .map((a) => (
                    <AchievementBadge key={a.id} achievement={a} />
                  ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {achievements.filter((a) => !a.unlocked).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Заблокированы
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {achievements
                  .filter((a) => !a.unlocked)
                  .map((a) => (
                    <AchievementBadge key={a.id} achievement={a} />
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
