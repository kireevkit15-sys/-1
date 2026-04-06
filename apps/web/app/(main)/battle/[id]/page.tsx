"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type BattlePhase = "category" | "attack" | "defense" | "result";

const categories = [
  { id: "strategy", label: "Стратегия", icon: "S", color: "bg-accent-red/20 text-accent-red border-accent-red/30" },
  { id: "philosophy", label: "Философия", icon: "F", color: "bg-accent/20 text-accent border-accent/30" },
  { id: "logic", label: "Логика", icon: "L", color: "bg-accent-green/20 text-accent-green border-accent-green/30" },
  { id: "rhetoric", label: "Риторика", icon: "R", color: "bg-accent-gold/20 text-accent-gold border-accent-gold/30" },
  { id: "erudition", label: "Эрудиция", icon: "E", color: "bg-accent-purple/20 text-accent-purple border-accent-purple/30" },
];

const mockQuestion = {
  text: "Является ли следующее утверждение логической ошибкой: «Все успешные люди встают рано, значит, чтобы быть успешным, нужно вставать рано»?",
  category: "logic",
};

export default function BattlePage() {
  const [phase, setPhase] = useState<BattlePhase>("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ player: 0, opponent: 0 });

  // Category select phase
  if (phase === "category") {
    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        {/* Round indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Раунд {round}/5</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-accent">{score.player}</span>
            <span className="text-text-muted">:</span>
            <span className="text-accent-red">{score.opponent}</span>
          </div>
        </div>

        {/* Phase title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Выбери категорию</h2>
          <p className="text-text-muted text-sm">Атакуй соперника вопросом из выбранной области</p>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPhase("attack");
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${cat.color}`}
            >
              <span className="text-lg font-serif font-bold">{cat.icon}</span>
              <span className="font-semibold">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Attack phase
  if (phase === "attack") {
    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Раунд {round}/5 — Атака</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-accent">{score.player}</span>
            <span className="text-text-muted">:</span>
            <span className="text-accent-red">{score.opponent}</span>
          </div>
        </div>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-serif font-bold">
              {categories.find((c) => c.id === selectedCategory)?.icon}
            </span>
            <h3 className="font-semibold text-sm text-text-secondary">
              {categories.find((c) => c.id === selectedCategory)?.label}
            </h3>
          </div>
          <p className="text-text-primary leading-relaxed">
            Соперник получает ваш вопрос. Ожидайте ответа...
          </p>
          <div className="pt-2">
            <Button fullWidth onClick={() => setPhase("defense")}>
              Далее: Защита
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Defense phase
  if (phase === "defense") {
    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Раунд {round}/5 — Защита</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-accent">{score.player}</span>
            <span className="text-text-muted">:</span>
            <span className="text-accent-red">{score.opponent}</span>
          </div>
        </div>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-serif font-bold">L</span>
            <h3 className="font-semibold text-sm text-text-secondary">Логика</h3>
          </div>
          <p className="text-text-primary leading-relaxed">{mockQuestion.text}</p>
        </Card>

        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Напишите ваш ответ..."
            rows={4}
            className="w-full rounded-2xl bg-surface border border-accent/15 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none"
          />
          <Button
            fullWidth
            onClick={() => {
              setScore((s) => ({ ...s, player: s.player + 1 }));
              setPhase("result");
            }}
            disabled={!answer.trim()}
          >
            Отправить ответ
          </Button>
        </div>

        {/* Timer */}
        <div className="text-center">
          <span className="text-sm text-text-muted">Осталось: 60 сек</span>
        </div>
      </div>
    );
  }

  // Result phase
  return (
    <div className="px-4 pt-8 pb-24 space-y-6">
      <div className="text-center space-y-4 pt-8">
        <div>
          {score.player > score.opponent
            ? <span className="text-6xl text-accent-gold font-serif">W</span>
            : score.player === score.opponent
            ? <span className="text-5xl text-text-secondary font-serif">&mdash;</span>
            : <span className="text-5xl text-accent-red font-serif">L</span>}
        </div>
        <h2 className="text-2xl font-bold">
          {round < 5 ? "Раунд завершен" : "Батл окончен!"}
        </h2>

        {/* Score */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-accent">{score.player}</p>
            <p className="text-xs text-text-muted mt-1">Вы</p>
          </div>
          <span className="text-text-muted text-2xl">:</span>
          <div className="text-center">
            <p className="text-3xl font-bold text-accent-red">{score.opponent}</p>
            <p className="text-xs text-text-muted mt-1">Соперник</p>
          </div>
        </div>

        {/* Round result detail */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Оценка AI-судьи</span>
            <span className="text-sm font-semibold text-accent-green">+1 балл</span>
          </div>
        </Card>
      </div>

      <div className="space-y-3 pt-4">
        {round < 5 ? (
          <Button
            fullWidth
            onClick={() => {
              setRound((r) => r + 1);
              setAnswer("");
              setPhase("category");
            }}
          >
            Следующий раунд
          </Button>
        ) : (
          <Button fullWidth onClick={() => (window.location.href = "/")}>
            На главную
          </Button>
        )}
      </div>
    </div>
  );
}
