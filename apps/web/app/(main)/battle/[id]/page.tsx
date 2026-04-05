"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type BattlePhase = "category" | "attack" | "defense" | "result";

const categories = [
  { id: "strategy", label: "Стратегия", emoji: "♟️", color: "bg-accent-red/20 text-accent-red border-accent-red/30" },
  { id: "philosophy", label: "Философия", emoji: "🏛️", color: "bg-accent-blue/20 text-accent-blue border-accent-blue/30" },
  { id: "logic", label: "Логика", emoji: "🔗", color: "bg-accent-green/20 text-accent-green border-accent-green/30" },
  { id: "rhetoric", label: "Риторика", emoji: "🎤", color: "bg-accent-gold/20 text-accent-gold border-accent-gold/30" },
  { id: "erudition", label: "Эрудиция", emoji: "📚", color: "bg-accent-purple/20 text-accent-purple border-accent-purple/30" },
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
      <div className="px-4 pt-8 pb-6 space-y-6">
        {/* Round indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">Раунд {round}/5</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-accent-blue">{score.player}</span>
            <span className="text-white/20">:</span>
            <span className="text-accent-red">{score.opponent}</span>
          </div>
        </div>

        {/* Phase title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Выбери категорию</h2>
          <p className="text-white/40 text-sm">Атакуй соперника вопросом из выбранной области</p>
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
              <span className="text-2xl">{cat.emoji}</span>
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
      <div className="px-4 pt-8 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">Раунд {round}/5 — Атака</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-accent-blue">{score.player}</span>
            <span className="text-white/20">:</span>
            <span className="text-accent-red">{score.opponent}</span>
          </div>
        </div>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {categories.find((c) => c.id === selectedCategory)?.emoji}
            </span>
            <h3 className="font-semibold text-sm text-white/60">
              {categories.find((c) => c.id === selectedCategory)?.label}
            </h3>
          </div>
          <p className="text-white/80 leading-relaxed">
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
      <div className="px-4 pt-8 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">Раунд {round}/5 — Защита</span>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-accent-blue">{score.player}</span>
            <span className="text-white/20">:</span>
            <span className="text-accent-red">{score.opponent}</span>
          </div>
        </div>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔗</span>
            <h3 className="font-semibold text-sm text-white/60">Логика</h3>
          </div>
          <p className="text-white/90 leading-relaxed">{mockQuestion.text}</p>
        </Card>

        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Напишите ваш ответ..."
            rows={4}
            className="w-full rounded-2xl bg-surface border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent-blue/50 transition-colors resize-none"
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
          <span className="text-sm text-white/30">Осталось: 60 сек</span>
        </div>
      </div>
    );
  }

  // Result phase
  return (
    <div className="px-4 pt-8 pb-6 space-y-6">
      <div className="text-center space-y-4 pt-8">
        <div className="text-6xl">
          {score.player > score.opponent ? "🏆" : score.player === score.opponent ? "🤝" : "😤"}
        </div>
        <h2 className="text-2xl font-bold">
          {round < 5 ? "Раунд завершен" : "Батл окончен!"}
        </h2>

        {/* Score */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-accent-blue">{score.player}</p>
            <p className="text-xs text-white/40 mt-1">Вы</p>
          </div>
          <span className="text-white/20 text-2xl">:</span>
          <div className="text-center">
            <p className="text-3xl font-bold text-accent-red">{score.opponent}</p>
            <p className="text-xs text-white/40 mt-1">Соперник</p>
          </div>
        </div>

        {/* Round result detail */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Оценка AI-судьи</span>
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
