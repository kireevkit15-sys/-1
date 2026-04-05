"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type MatchmakingState = "idle" | "searching" | "found";

export default function NewBattlePage() {
  const [state, setState] = useState<MatchmakingState>("idle");

  const startSearch = (mode: "bot" | "player") => {
    setState("searching");
    // Simulate matchmaking
    setTimeout(() => {
      setState("found");
    }, 3000);
  };

  if (state === "searching") {
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        {/* Pulsing animation */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-accent-blue/20 animate-ping absolute inset-0" />
          <div className="w-24 h-24 rounded-full bg-accent-blue/30 flex items-center justify-center relative">
            <span className="text-4xl">&#9889;</span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Поиск соперника...</h2>
          <p className="text-white/40 text-sm">Подбираем достойного оппонента</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setState("idle")}
        >
          Отменить
        </Button>
      </div>
    );
  }

  if (state === "found") {
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[70vh] space-y-8">
        <div className="flex items-center gap-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center text-2xl border border-white/10">
              🧠
            </div>
            <p className="text-sm font-medium">Вы</p>
          </div>
          <span className="text-2xl font-bold text-accent-red">VS</span>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center text-2xl border border-white/10">
              🤖
            </div>
            <p className="text-sm font-medium">BrainBot</p>
          </div>
        </div>
        <Button onClick={() => (window.location.href = "/battle/demo")}>
          Начать батл
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Интеллект-батл</h1>
        <p className="text-white/40 text-sm">5 раундов. Покажи силу разума.</p>
      </div>

      {/* Battle vs Bot */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-green/5 to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-green/20 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h3 className="font-semibold">Игра с ботом</h3>
              <p className="text-white/40 text-xs">
                Тренировка с AI-оппонентом разной сложности
              </p>
            </div>
          </div>
          <Button fullWidth onClick={() => startSearch("bot")}>
            Играть с ботом
          </Button>
        </div>
      </Card>

      {/* Battle vs Player */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-red/5 to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-red/20 flex items-center justify-center text-xl">
              &#9889;
            </div>
            <div>
              <h3 className="font-semibold">Найти соперника</h3>
              <p className="text-white/40 text-xs">
                Рейтинговый матч с реальным игроком
              </p>
            </div>
          </div>
          <Button fullWidth variant="danger" onClick={() => startSearch("player")}>
            Найти соперника
          </Button>
        </div>
      </Card>

      {/* Rules */}
      <Card padding="sm" className="space-y-2">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Правила батла
        </h3>
        <ul className="space-y-1.5 text-sm text-white/50">
          <li className="flex items-start gap-2">
            <span className="text-accent-blue mt-0.5">1.</span>
            Выбери категорию для атаки
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-blue mt-0.5">2.</span>
            Задай вопрос или выбери из предложенных
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-blue mt-0.5">3.</span>
            Защищайся от вопросов соперника
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-blue mt-0.5">4.</span>
            AI-судья оценивает ответы
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent-blue mt-0.5">5.</span>
            Побеждает набравший больше баллов за 5 раундов
          </li>
        </ul>
      </Card>
    </div>
  );
}
