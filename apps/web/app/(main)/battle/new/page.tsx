"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBattle } from "@/hooks/useBattle";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

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
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When battle starts, show opponent screen for 2.5s then redirect
  useEffect(() => {
    if (status === "in_battle" && battle) {
      setShowOpponent(true);
      redirectTimer.current = setTimeout(() => {
        router.push(`/battle/${battle.id}`);
      }, 2500);
    }
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [status, battle, router]);

  // -- Opponent found screen --------------------------------------------------

  if (showOpponent && battle) {
    const opponent = battle.player2;
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        <div className="text-center space-y-6">
          <p className="text-sm text-accent-gold font-semibold uppercase tracking-wider battle-fade-up battle-stagger-1">
            Соперник найден
          </p>

          {/* VS display */}
          <div className="flex items-center justify-center gap-6 battle-scale-in">
            {/* Player */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent/30">
                <span className="text-accent text-xl font-bold">
                  {battle.player1.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-text-primary max-w-[80px] truncate">
                {battle.player1.name}
              </span>
            </div>

            {/* VS */}
            <div className="battle-slam">
              <span className="text-2xl font-bold text-accent-gold font-serif">VS</span>
            </div>

            {/* Opponent */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-accent-red/20 flex items-center justify-center border-2 border-accent-red/30">
                <span className="text-accent-red text-xl font-bold">
                  {opponent.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-text-primary max-w-[80px] truncate">
                {opponent.name}
              </span>
            </div>
          </div>

          <p className="text-text-muted text-sm battle-fade-up battle-stagger-3">
            Баттл начинается...
          </p>
        </div>

        {/* Loading bar */}
        <div className="w-48 h-1 bg-surface-light rounded-full overflow-hidden battle-fade-up battle-stagger-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-gold"
            style={{
              animation: "battle-load-bar 2.5s ease-in-out forwards",
            }}
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
                Тренировка с AI-оппонентом разной сложности
              </p>
            </div>
          </div>
          <Button fullWidth onClick={createBotBattle}>
            Играть с ботом
          </Button>
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
          <Button fullWidth onClick={() => searchOpponent()}>
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
