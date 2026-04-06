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
          <div className="w-24 h-24 rounded-full bg-accent/20 animate-ping absolute inset-0" />
          <div className="w-24 h-24 rounded-full bg-accent/30 flex items-center justify-center relative">
            <svg className="w-10 h-10 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Поиск соперника...</h2>
          <p className="text-text-muted text-sm">Подбираем достойного оппонента</p>
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
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border border-accent/15">
              <span className="text-accent text-sm font-bold">И</span>
            </div>
            <p className="text-sm font-medium text-text-primary">Вы</p>
          </div>
          <span className="text-2xl font-bold text-accent">VS</span>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-accent-warm/20 flex items-center justify-center border border-accent/15">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" /><circle cx="12" cy="10" r="1" fill="currentColor" /></svg>
            </div>
            <p className="text-sm font-medium text-text-primary">BrainBot</p>
          </div>
        </div>
        <Button onClick={() => (window.location.href = "/battle/demo")}>
          Начать батл
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-24 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Интеллект-батл</h1>
        <p className="text-text-muted text-sm">5 раундов. Покажи силу разума.</p>
      </div>

      {/* Battle vs Bot */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-warm/5 to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-warm/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 8.5a1 1 0 011-1h2a1 1 0 011 1v1.5a1 1 0 01-1 1h-2a1 1 0 01-1-1V8.5z" /><circle cx="12" cy="12.5" r="0.5" fill="currentColor" /></svg>
            </div>
            <div>
              <h3 className="font-semibold">Игра с ботом</h3>
              <p className="text-text-muted text-xs">
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
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <div>
              <h3 className="font-semibold">Найти соперника</h3>
              <p className="text-text-muted text-xs">
                Рейтинговый матч с реальным игроком
              </p>
            </div>
          </div>
          <Button fullWidth onClick={() => startSearch("player")}>
            Найти соперника
          </Button>
        </div>
      </Card>

      {/* Rules */}
      <Card padding="sm" className="space-y-2">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Правила батла
        </h3>
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">1.</span>
            Выбери категорию для атаки
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">2.</span>
            Задай вопрос или выбери из предложенных
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">3.</span>
            Защищайся от вопросов соперника
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">4.</span>
            AI-судья оценивает ответы
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">5.</span>
            Побеждает набравший больше баллов за 5 раундов
          </li>
        </ul>
      </Card>
    </div>
  );
}
