"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBattle } from "@/hooks/useBattle";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { playSelect, playBattleStart } from "@/lib/sounds";

// Branch stats for comparison display
const BRANCH_STATS = [
  { label: "Стратегия", color: "bg-cyan-500", key: "strategy" },
  { label: "Логика",    color: "bg-green-500", key: "logic" },
  { label: "Эрудиция",  color: "bg-purple-500", key: "erudition" },
  { label: "Риторика",  color: "bg-orange-500", key: "rhetoric" },
  { label: "Интуиция",  color: "bg-pink-500",   key: "intuition" },
] as const;

// Default demo stat values when real data is unavailable
const DEFAULT_STATS: Record<string, number> = {
  strategy: 65,
  logic: 72,
  erudition: 58,
  rhetoric: 80,
  intuition: 45,
};

const DEFAULT_OPPONENT_STATS: Record<string, number> = {
  strategy: 78,
  logic: 60,
  erudition: 85,
  rhetoric: 55,
  intuition: 70,
};

// Countdown steps: 3, 2, 1, GO
const COUNTDOWN_STEPS = ["3", "2", "1", "GO!"];
// Duration per step in ms
const STEP_DURATION = 900;

type BotLevel = "NOVICE" | "STANDARD" | "EXPERT";

const botLevelConfig: { value: BotLevel; label: string; desc: string; accuracy: string; color: string }[] = [
  { value: "NOVICE", label: "Новичок", desc: "Отвечает правильно в 40% случаев", accuracy: "40%", color: "text-green-400 border-green-400/25 bg-green-400/5" },
  { value: "STANDARD", label: "Стандарт", desc: "Отвечает правильно в 60% случаев", accuracy: "60%", color: "text-accent border-accent/25 bg-accent/5" },
  { value: "EXPERT", label: "Эксперт", desc: "Отвечает правильно в 85% случаев", accuracy: "85%", color: "text-accent-red border-accent-red/25 bg-accent-red/5" },
];

export default function NewBattlePage() {
  const router = useRouter();
  const {
    status,
    battle,
    error,
    createBotBattle,
    searchOpponent,
    cancelSearch,
    reset,
  } = useBattle();

  const [showOpponent, setShowOpponent] = useState(false);
  // null = VS screen, 0-3 = countdown index
  const [countdownStep, setCountdownStep] = useState<number | null>(null);
  const [showBotLevels, setShowBotLevels] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // When battle starts, show VS screen then run countdown then redirect
  useEffect(() => {
    if (status === "in_battle" && battle) {
      setShowOpponent(true);
      playBattleStart();

      // Show VS screen for 2s, then start countdown
      redirectTimer.current = setTimeout(() => {
        let step = 0;
        setCountdownStep(0);

        countdownInterval.current = setInterval(() => {
          step += 1;
          if (step < COUNTDOWN_STEPS.length) {
            setCountdownStep(step);
          } else {
            // Countdown finished — navigate
            clearInterval(countdownInterval.current!);
            router.push(`/battle/${battle.id}`);
          }
        }, STEP_DURATION);
      }, 2000);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [status, battle, router]);

  // -- Countdown overlay -----------------------------------------------------

  if (showOpponent && battle && countdownStep !== null) {
    const label = COUNTDOWN_STEPS[countdownStep];
    const isGo = label === "GO!";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        {/* key forces re-mount on each step so battle-slam reruns */}
        <div key={countdownStep} className="battle-slam text-center select-none">
          <span
            className={
              isGo
                ? "text-[7rem] font-black text-metallic leading-none"
                : "text-[10rem] font-black text-accent-gold leading-none"
            }
          >
            {label}
          </span>
        </div>
      </div>
    );
  }

  // -- Opponent found / VS screen --------------------------------------------

  if (showOpponent && battle) {
    const p1 = battle.player1;
    const opponent = battle.player2;
    const p1Stats: Record<string, number> = (p1 as { stats?: Record<string, number> }).stats ?? DEFAULT_STATS;
    const p2Stats: Record<string, number> = (opponent as { stats?: Record<string, number> }).stats ?? DEFAULT_OPPONENT_STATS;
    const p1Rank: string = (p1 as { rank?: string }).rank ?? "Новичок";
    const p2Rank: string = (opponent as { rank?: string }).rank ?? "Новичок";

    return (
      <div className="px-4 pt-16 flex flex-col items-center justify-center min-h-[85vh] space-y-8">
        {/* Label */}
        <p className="text-sm text-accent-gold font-semibold uppercase tracking-wider battle-fade-up battle-stagger-1">
          Соперник найден
        </p>

        {/* Avatars + VS */}
        <div className="flex items-center justify-center gap-8 battle-scale-in w-full max-w-xs">
          {/* Player 1 */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent/40 shadow-[0_0_20px_rgba(107,107,207,0.25)]">
              <span className="text-accent text-2xl font-black">
                {p1.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-semibold text-text-primary max-w-[90px] truncate text-center">
              {p1.name}
            </span>
            <span className="rank-badge text-xs px-2 py-0.5">
              {p1Rank}
            </span>
          </div>

          {/* VS */}
          <div className="battle-slam flex-shrink-0">
            <span className="text-3xl font-black text-metallic font-serif">VS</span>
          </div>

          {/* Opponent */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-20 h-20 rounded-full bg-accent-red/20 flex items-center justify-center border-2 border-accent-red/40 shadow-[0_0_20px_rgba(192,57,43,0.25)]">
              <span className="text-accent-red text-2xl font-black">
                {opponent.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-semibold text-text-primary max-w-[90px] truncate text-center">
              {opponent.name}
            </span>
            <span className="rank-badge text-xs px-2 py-0.5">
              {p2Rank}
            </span>
          </div>
        </div>

        {/* Branch stats comparison */}
        <div className="w-full max-w-xs space-y-2 battle-fade-up battle-stagger-2">
          {BRANCH_STATS.map(({ label, color, key }) => {
            const v1 = p1Stats[key] ?? 50;
            const v2 = p2Stats[key] ?? 50;
            return (
              <div key={key} className="flex items-center gap-2">
                {/* Left bar (player 1) — grows leftward */}
                <div className="flex-1 flex justify-end">
                  <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden flex justify-end">
                    <div
                      className={`h-full rounded-full ${color} opacity-80`}
                      style={{ width: `${v1}%` }}
                    />
                  </div>
                </div>
                {/* Label */}
                <span className="text-[10px] text-text-muted w-16 text-center shrink-0 leading-tight">
                  {label}
                </span>
                {/* Right bar (opponent) — grows rightward */}
                <div className="flex-1">
                  <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} opacity-60`}
                      style={{ width: `${v2}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading bar */}
        <div className="w-48 h-1 bg-surface-light rounded-full overflow-hidden battle-fade-up battle-stagger-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-gold"
            style={{ animation: "battle-load-bar 2s ease-in-out forwards" }}
          />
        </div>
      </div>
    );
  }

  // -- Searching state --------------------------------------------------------

  if (status === "searching" || status === "connecting") {
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        {/* Pulsing rings */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-accent/15" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.4s" }} />
          <div className="absolute inset-4 rounded-full border border-accent/10" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.8s" }} />
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center border border-accent/25 relative">
            <svg
              className="w-7 h-7 text-accent-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">
            {status === "connecting" ? "Подключение..." : "Поиск соперника..."}
          </h2>
          <p className="text-text-muted text-sm">
            Подбираем достойного оппонента
          </p>
        </div>
        <Button variant="secondary" onClick={cancelSearch}>
          Отменить
        </Button>
      </div>
    );
  }

  // Error / matchmaking timeout
  if (status === "error" && error) {
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-accent-red">
            {error}
          </h2>
        </div>
        <div className="flex gap-3">
          <Button onClick={createBotBattle}>Играть с ботом</Button>
          <Button variant="secondary" onClick={reset}>
            Назад
          </Button>
        </div>
      </div>
    );
  }

  // Default: mode selection
  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Интеллект-баттл</h1>
        <p className="text-text-muted text-sm">
          5 раундов. Покажи силу разума.
        </p>
      </div>

      {/* Battle vs Bot */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-warm/5 to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-warm/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Игра с ботом</h3>
              <p className="text-text-muted text-xs">
                Тренировка с AI-оппонентом
              </p>
            </div>
          </div>

          {!showBotLevels ? (
            <Button fullWidth onClick={() => { playSelect(); setShowBotLevels(true); }}>
              Выбрать сложность
            </Button>
          ) : (
            <div className="space-y-2">
              {botLevelConfig.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => { playSelect(); createBotBattle(lvl.value); }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all active:scale-[0.98] ${lvl.color}`}
                >
                  <div className="text-left">
                    <span className="font-semibold text-sm">{lvl.label}</span>
                    <p className="text-xs text-text-muted mt-0.5">{lvl.desc}</p>
                  </div>
                  <span className="text-sm font-mono font-bold opacity-60">
                    {lvl.accuracy}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Battle vs Player */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Найти соперника</h3>
              <p className="text-text-muted text-xs">
                Рейтинговый матч с реальным игроком
              </p>
            </div>
          </div>
          <Button fullWidth onClick={() => { playSelect(); searchOpponent(); }}>
            Найти соперника
          </Button>
        </div>
      </Card>

      {/* Demo mode */}
      <Card padding="sm" className="border-accent/15">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Демо-режим</p>
            <p className="text-xs text-text-muted">Попробуй баттл без регистрации</p>
          </div>
          <a
            href="/battle/demo"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-light text-text-primary hover:bg-surface-light/80 transition-all active:scale-95 border border-accent/10"
          >
            Попробовать
          </a>
        </div>
      </Card>

      {/* Rules */}
      <Card padding="sm" className="space-y-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Правила баттла
        </h3>
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">1.</span>
            Выбери категорию для атаки
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">2.</span>
            Выбери сложность вопроса: бронза, серебро или золото
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">3.</span>
            Ответь правильно, чтобы нанести урон крепости
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">4.</span>
            Защищайся от атак соперника
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">5.</span>
            Побеждает тот, кто разрушит крепость или наберёт больше очков
          </li>
        </ul>
      </Card>
    </div>
  );
}
