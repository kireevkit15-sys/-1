"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { useApiToken } from "@/hooks/useApiToken";
import { API_BASE } from "@/lib/api/base";

interface QuestionStats {
  total: number;
  byBranch: { branch: string; count: number }[];
  byDifficulty: { difficulty: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

interface AnswerStats {
  totalQuestions: number;
  withAnswerData: number;
  readyForCalibration: number;
  difficultyBreakdown: {
    difficulty: string;
    count: number;
    avgTotalAnswers: number;
    avgCorrectRate: number;
  }[];
}

interface AnalyticsCounts {
  [eventType: string]: number;
}

interface LeaderEntry {
  id: string;
  username: string;
  rating: number;
  level: number;
  totalXp: number;
}

// Fallback data for when API is unavailable
const FALLBACK_QUESTION_STATS: QuestionStats = {
  total: 523,
  byBranch: [
    { branch: "STRATEGY", count: 267 },
    { branch: "LOGIC", count: 256 },
    { branch: "ERUDITION", count: 0 },
    { branch: "RHETORIC", count: 0 },
    { branch: "INTUITION", count: 0 },
  ],
  byDifficulty: [
    { difficulty: "BRONZE", count: 210 },
    { difficulty: "SILVER", count: 188 },
    { difficulty: "GOLD", count: 125 },
  ],
  byCategory: [
    { category: "game_theory", count: 45 },
    { category: "probability", count: 38 },
    { category: "deduction", count: 35 },
    { category: "decision_making", count: 32 },
    { category: "pattern_recognition", count: 28 },
  ],
};

const FALLBACK_ANSWER_STATS: AnswerStats = {
  totalQuestions: 523,
  withAnswerData: 340,
  readyForCalibration: 120,
  difficultyBreakdown: [
    { difficulty: "BRONZE", count: 210, avgTotalAnswers: 45, avgCorrectRate: 78 },
    { difficulty: "SILVER", count: 188, avgTotalAnswers: 32, avgCorrectRate: 56 },
    { difficulty: "GOLD", count: 125, avgTotalAnswers: 18, avgCorrectRate: 34 },
  ],
};

const FALLBACK_ANALYTICS: AnalyticsCounts = {
  BATTLE_STARTED: 1247,
  BATTLE_FINISHED: 1180,
  ANSWER_GIVEN: 5900,
  SESSION_START: 890,
  WARMUP_COMPLETED: 456,
  ACHIEVEMENT_UNLOCKED: 234,
  REFERRAL_APPLIED: 67,
};

const FALLBACK_LEADERS: LeaderEntry[] = [
  { id: "1", username: "StrategicMind", rating: 1580, level: 18, totalXp: 12400 },
  { id: "2", username: "LogicKing", rating: 1520, level: 16, totalXp: 10800 },
  { id: "3", username: "Thinker42", rating: 1490, level: 15, totalXp: 9600 },
  { id: "4", username: "BrainPower", rating: 1450, level: 14, totalXp: 8900 },
  { id: "5", username: "MindForge", rating: 1410, level: 13, totalXp: 7800 },
];

const difficultyLabels: Record<string, string> = {
  BRONZE: "Бронза",
  SILVER: "Серебро",
  GOLD: "Золото",
};

const branchLabels: Record<string, string> = {
  STRATEGY: "Стратегия",
  LOGIC: "Логика",
  ERUDITION: "Эрудиция",
  RHETORIC: "Риторика",
  INTUITION: "Интуиция",
};

const eventLabels: Record<string, string> = {
  BATTLE_STARTED: "Баттлы начаты",
  BATTLE_FINISHED: "Баттлы завершены",
  ANSWER_GIVEN: "Ответов дано",
  SESSION_START: "Сессий",
  SESSION_END: "Сессий завершено",
  WARMUP_COMPLETED: "Разминок пройдено",
  ACHIEVEMENT_UNLOCKED: "Достижений",
  REFERRAL_APPLIED: "Рефералов",
};

export default function AdminDashboard() {
  const token = useApiToken();
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null);
  const [answerStats, setAnswerStats] = useState<AnswerStats | null>(null);
  const [analyticsCounts, setAnalyticsCounts] = useState<AnalyticsCounts | null>(null);
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const results = await Promise.allSettled([
        fetch(`${API_BASE}/questions/stats`, { headers }),
        fetch(`${API_BASE}/questions/answer-stats`, { headers }),
        fetch(`${API_BASE}/analytics/counts`, { headers }),
        fetch(`${API_BASE}/stats/leaderboard?type=rating&limit=5`, { headers }),
      ]);

      const allFailed = results.every((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));

      if (allFailed) {
        setIsDemo(true);
        setQuestionStats(FALLBACK_QUESTION_STATS);
        setAnswerStats(FALLBACK_ANSWER_STATS);
        setAnalyticsCounts(FALLBACK_ANALYTICS);
        setLeaders(FALLBACK_LEADERS);
      } else {
        setIsDemo(false);
        if (results[0].status === "fulfilled" && results[0].value.ok) {
          setQuestionStats(await results[0].value.json());
        } else {
          setQuestionStats(FALLBACK_QUESTION_STATS);
        }
        if (results[1].status === "fulfilled" && results[1].value.ok) {
          setAnswerStats(await results[1].value.json());
        } else {
          setAnswerStats(FALLBACK_ANSWER_STATS);
        }
        if (results[2].status === "fulfilled" && results[2].value.ok) {
          setAnalyticsCounts(await results[2].value.json());
        } else {
          setAnalyticsCounts(FALLBACK_ANALYTICS);
        }
        if (results[3].status === "fulfilled" && results[3].value.ok) {
          const data = await results[3].value.json();
          setLeaders(Array.isArray(data) ? data.slice(0, 5) : []);
        } else {
          setLeaders(FALLBACK_LEADERS);
        }
      }
    } catch {
      setIsDemo(true);
      setQuestionStats(FALLBACK_QUESTION_STATS);
      setAnswerStats(FALLBACK_ANSWER_STATS);
      setAnalyticsCounts(FALLBACK_ANALYTICS);
      setLeaders(FALLBACK_LEADERS);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Дашборд</h1>
          <p className="text-text-secondary text-sm mt-1">
            Статистика платформы в реальном времени
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          Обновить
        </button>
      </div>

      {isDemo && (
        <div className="bg-accent-warm/10 border border-accent-warm/20 rounded-xl px-4 py-3 text-sm text-accent">
          Демо-режим: API недоступен, показаны примерные данные
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card padding="md">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Вопросов
          </p>
          <p className="text-3xl font-bold text-accent">
            {questionStats?.total || 0}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Баттлов
          </p>
          <p className="text-3xl font-bold text-accent-gold">
            {analyticsCounts?.BATTLE_FINISHED || 0}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Ответов
          </p>
          <p className="text-3xl font-bold text-text-primary">
            {analyticsCounts?.ANSWER_GIVEN || 0}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">
            Сессий
          </p>
          <p className="text-3xl font-bold text-text-primary">
            {analyticsCounts?.SESSION_START || 0}
          </p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Questions by Branch */}
        <Card padding="lg">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-text-secondary mb-4">
            Вопросы по веткам
          </h2>
          <div className="space-y-3">
            {questionStats?.byBranch.map((b) => {
              const pct = questionStats.total
                ? Math.round((b.count / questionStats.total) * 100)
                : 0;
              return (
                <div key={b.branch}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-primary">
                      {branchLabels[b.branch] || b.branch}
                    </span>
                    <span className="text-text-muted">
                      {b.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-warm to-accent rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Questions by Difficulty */}
        <Card padding="lg">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-text-secondary mb-4">
            Вопросы по сложности
          </h2>
          <div className="space-y-3">
            {questionStats?.byDifficulty.map((d) => {
              const pct = questionStats.total
                ? Math.round((d.count / questionStats.total) * 100)
                : 0;
              const color =
                d.difficulty === "GOLD"
                  ? "from-accent-gold to-accent-gold/60"
                  : d.difficulty === "SILVER"
                    ? "from-accent-silver to-accent-silver/60"
                    : "from-accent-bronze to-accent-bronze/60";
              return (
                <div key={d.difficulty}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-primary">
                      {difficultyLabels[d.difficulty] || d.difficulty}
                    </span>
                    <span className="text-text-muted">
                      {d.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Answer Performance */}
        <Card padding="lg">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-text-secondary mb-4">
            Качество вопросов
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">
                {answerStats?.withAnswerData || 0}
              </p>
              <p className="text-xs text-text-muted mt-1">С ответами</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-gold">
                {answerStats?.readyForCalibration || 0}
              </p>
              <p className="text-xs text-text-muted mt-1">Калибровка</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">
                {answerStats
                  ? answerStats.totalQuestions - answerStats.withAnswerData
                  : 0}
              </p>
              <p className="text-xs text-text-muted mt-1">Без данных</p>
            </div>
          </div>
          {answerStats?.difficultyBreakdown.map((d) => (
            <div
              key={d.difficulty}
              className="flex items-center justify-between py-2 border-t border-border"
            >
              <span className="text-sm text-text-primary">
                {difficultyLabels[d.difficulty] || d.difficulty}
              </span>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>~{d.avgTotalAnswers} отв.</span>
                <span
                  className={
                    d.avgCorrectRate > 70
                      ? "text-green-400"
                      : d.avgCorrectRate > 40
                        ? "text-accent-gold"
                        : "text-accent-red"
                  }
                >
                  {d.avgCorrectRate}% верных
                </span>
              </div>
            </div>
          ))}
        </Card>

        {/* Events / Activity */}
        <Card padding="lg">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-text-secondary mb-4">
            Активность
          </h2>
          <div className="space-y-2">
            {analyticsCounts &&
              Object.entries(analyticsCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-text-primary">
                      {eventLabels[key] || key}
                    </span>
                    <span className="text-sm font-medium text-accent tabular-nums">
                      {value.toLocaleString("ru-RU")}
                    </span>
                  </div>
                ))}
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card padding="lg">
        <h2 className="font-semibold text-sm uppercase tracking-widest text-text-secondary mb-4">
          Топ-5 игроков
        </h2>
        <div className="space-y-2">
          {leaders.map((player, i) => (
            <div
              key={player.id}
              className="flex items-center gap-3 py-2 border-b border-border last:border-0"
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {player.username}
                </p>
                <p className="text-xs text-text-muted">
                  Lvl {player.level}
                </p>
              </div>
              <span className="text-sm font-bold text-accent tabular-nums">
                {player.rating}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Categories */}
      {questionStats?.byCategory && questionStats.byCategory.length > 0 && (
        <Card padding="lg">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-text-secondary mb-4">
            Топ категорий
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {questionStats.byCategory.slice(0, 9).map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between bg-surface-light/50 rounded-lg px-3 py-2"
              >
                <span className="text-xs text-text-primary truncate mr-2">
                  {cat.category.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-medium text-accent-gold tabular-nums flex-shrink-0">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
