"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBattle } from "@/hooks/useBattle";
import { BattlePhase, Difficulty, DefenseType } from "@razum/shared";
import type { BattleState } from "@razum/shared";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DifficultyPicker from "@/components/battle/DifficultyPicker";

const difficultyLabels: Record<string, string> = {
  [Difficulty.BRONZE]: "Бронза",
  [Difficulty.SILVER]: "Серебро",
  [Difficulty.GOLD]: "Золото",
};

// ---------------------------------------------------------------------------
// Timer hook
// ---------------------------------------------------------------------------

function useCountdown(timeLimit: number, active: boolean) {
  const [seconds, setSeconds] = useState(timeLimit);

  useEffect(() => {
    if (!active) {
      setSeconds(timeLimit);
      return;
    }
    setSeconds(timeLimit);
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimit, active]);

  const progress = timeLimit > 0 ? seconds / timeLimit : 0;
  return { seconds, progress };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimerCircle({
  seconds,
  progress,
}: {
  seconds: number;
  progress: number;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(207,157,123,0.15)"
          strokeWidth="3"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={seconds <= 10 ? "#89352A" : "#CF9D7B"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span
        className={`absolute text-sm font-bold ${seconds <= 10 ? "text-accent-red" : "text-text-primary"}`}
      >
        {seconds}
      </span>
    </div>
  );
}

function HpBar({ hp, maxHp = 100, color }: { hp: number; maxHp?: number; color: "accent" | "accent-red" }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const barColor = color === "accent"
    ? "bg-gradient-to-r from-accent-warm via-accent to-accent-gold"
    : "bg-gradient-to-r from-accent-red to-accent-red/70";
  return (
    <div className="h-1.5 w-full bg-surface-light rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreBar({ battle }: { battle: BattleState }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/15">
            <span className="text-xs font-bold text-accent">
              {battle.player1.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-secondary truncate max-w-[80px]">
              {battle.player1.name}
            </p>
            <p className="text-sm font-bold text-accent">{battle.player1.hp} HP</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-text-muted">
            Раунд {battle.currentRound}/{battle.totalRounds}
          </p>
          <div className="flex items-center gap-2 text-lg font-bold font-mono">
            <span className="text-accent">{battle.player1.score}</span>
            <span className="text-text-muted">:</span>
            <span className="text-accent-red">{battle.player2.score}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-text-secondary truncate max-w-[80px]">
              {battle.player2.name}
            </p>
            <p className="text-sm font-bold text-accent-red">
              {battle.player2.hp} HP
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center border border-accent-red/15">
            <span className="text-xs font-bold text-accent-red">
              {battle.player2.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* HP bars */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1">
          <HpBar hp={battle.player1.hp} color="accent" />
        </div>
        <div className="w-12" />
        <div className="flex-1">
          <HpBar hp={battle.player2.hp} color="accent-red" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Difficulty configs
// ---------------------------------------------------------------------------

const difficultyConfig = [
  {
    value: Difficulty.BRONZE,
    label: "Бронза",
    desc: "Лёгкий вопрос, малый урон",
    tierClass: "tier-bronze",
    text: "text-accent-bronze",
    badge: "bg-accent-bronze/20 text-accent-bronze",
  },
  {
    value: Difficulty.SILVER,
    label: "Серебро",
    desc: "Средний вопрос, средний урон",
    tierClass: "tier-silver",
    text: "text-accent-silver",
    badge: "bg-accent-silver/15 text-accent-silver",
  },
  {
    value: Difficulty.GOLD,
    label: "Золото",
    desc: "Сложный вопрос, максимальный урон",
    tierClass: "tier-gold",
    text: "text-accent-gold",
    badge: "bg-accent-gold/20 text-accent-gold",
  },
];

const defenseConfig = [
  {
    value: DefenseType.ACCEPT,
    label: "Принять удар",
    desc: "Пропустить атаку без сопротивления",
    bg: "bg-text-muted/10",
    border: "border-text-muted/30",
    text: "text-text-muted",
  },
  {
    value: DefenseType.DISPUTE,
    label: "Оспорить",
    desc: "50% шанс отразить атаку",
    bg: "bg-accent/15",
    border: "border-accent/30",
    text: "text-accent",
  },
  {
    value: DefenseType.COUNTER,
    label: "Контратака",
    desc: "30% шанс, но отражает весь урон",
    bg: "bg-accent-gold/15",
    border: "border-accent-gold/30",
    text: "text-accent-gold",
  },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BattlePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const {
    status,
    battle,
    result,
    error,
    opponentDisconnected,
    selectCategory,
    attack,
    defend,
    reset,
    disconnect,
  } = useBattle(params.id);

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty | null>(null);

  const timerActive =
    !!battle &&
    (battle.phase === BattlePhase.ROUND_ATTACK ||
      battle.phase === BattlePhase.ROUND_DEFENSE);

  const { seconds, progress } = useCountdown(
    battle?.timeLimit ?? 60,
    timerActive,
  );

  // Reset difficulty selection when phase changes
  useEffect(() => {
    setSelectedDifficulty(null);
  }, [battle?.phase]);

  const handleAttack = useCallback(
    (answerIndex: number) => {
      if (!selectedDifficulty) return;
      // TODO: questionId will come from server question service
      const questionId = "placeholder";
      attack(selectedDifficulty, answerIndex, questionId);
    },
    [selectedDifficulty, attack],
  );

  // -- No battle state yet --------------------------------------------------

  if (!battle && status !== "finished") {
    return (
      <div className="px-4 pt-20 flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        <p className="text-text-muted text-sm">Загрузка баттла...</p>
        {error && (
          <p className="text-accent-red text-sm text-center">{error}</p>
        )}
      </div>
    );
  }

  // -- Battle finished -------------------------------------------------------

  if (status === "finished" && result) {
    const isWin =
      battle &&
      result.winnerId === battle.player1.id;
    const isDraw = result.winnerId === null;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <div className="text-center space-y-4 pt-8">
          <div>
            {isWin ? (
              <span className="text-6xl text-accent-gold font-serif">W</span>
            ) : isDraw ? (
              <span className="text-5xl text-text-secondary font-serif">
                &mdash;
              </span>
            ) : (
              <span className="text-5xl text-accent-red font-serif">L</span>
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {isWin ? "Победа!" : isDraw ? "Ничья" : "Поражение"}
          </h2>

          {/* Score */}
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-accent">
                {result.player1Score}
              </p>
              <p className="text-xs text-text-muted mt-1">Вы</p>
            </div>
            <span className="text-text-muted text-2xl">:</span>
            <div className="text-center">
              <p className="text-3xl font-bold text-accent-red">
                {result.player2Score}
              </p>
              <p className="text-xs text-text-muted mt-1">Соперник</p>
            </div>
          </div>

          {/* XP gained */}
          {battle && result.xpGained[battle.player1.id] != null && (
            <Card padding="sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  Опыт получен
                </span>
                <span className="text-sm font-semibold text-accent-gold">
                  +{result.xpGained[battle.player1.id]} XP
                </span>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <Button
            fullWidth
            onClick={() => {
              disconnect();
              router.push("/battle/new");
            }}
          >
            Новый баттл
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              disconnect();
              router.push("/");
            }}
          >
            На главную
          </Button>
        </div>
      </div>
    );
  }

  if (!battle) return null;

  // -- Opponent disconnected banner -----------------------------------------

  const disconnectBanner = opponentDisconnected && (
    <Card padding="sm" className="border-accent-red/30 bg-accent-red/5">
      <p className="text-sm text-accent-red text-center">
        Соперник отключился. Ожидание переподключения...
      </p>
    </Card>
  );

  // -- CATEGORY_SELECT phase ------------------------------------------------

  if (battle.phase === BattlePhase.CATEGORY_SELECT) {
    const isMyTurn = battle.currentAttackerId === battle.player1.id;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <ScoreBar battle={battle} />
        {disconnectBanner}

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">
            {isMyTurn ? "Выбери категорию" : "Соперник выбирает категорию..."}
          </h2>
          <p className="text-text-muted text-sm">
            {isMyTurn
              ? "Атакуй вопросом из выбранной области"
              : "Приготовься к защите"}
          </p>
        </div>

        {isMyTurn ? (
          <div className="space-y-3">
            {battle.categories.map((cat, idx) => {
              const styles = [
                "bg-accent-red/10 text-accent-red border-accent-red/25 hover:border-accent-red/50",
                "bg-accent-gold/10 text-accent-gold border-accent-gold/25 hover:border-accent-gold/50",
                "bg-accent/10 text-accent border-accent/25 hover:border-accent/50",
                "bg-accent-warm/10 text-accent-warm border-accent-warm/25 hover:border-accent-warm/50",
                "bg-accent-silver/10 text-accent-silver border-accent-silver/25 hover:border-accent-silver/50",
                "bg-accent-muted/10 text-accent-muted border-accent-muted/25 hover:border-accent-muted/50",
              ];
              return (
                <button
                  key={cat}
                  onClick={() => selectCategory(cat)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${styles[idx % styles.length]}`}
                >
                  <span className="text-lg font-serif font-bold">
                    {cat.charAt(0)}
                  </span>
                  <span className="font-semibold">{cat}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center pt-8">
            <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // -- ROUND_ATTACK phase ---------------------------------------------------

  if (battle.phase === BattlePhase.ROUND_ATTACK) {
    const isMyTurn = battle.currentAttackerId === battle.player1.id;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <ScoreBar battle={battle} />
        {disconnectBanner}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isMyTurn ? "Твоя атака" : "Соперник атакует..."}
            </h2>
            {battle.selectedCategory && (
              <p className="text-text-muted text-sm">
                {battle.selectedCategory}
              </p>
            )}
          </div>
          <TimerCircle seconds={seconds} progress={progress} />
        </div>

        {isMyTurn ? (
          <>
            {/* Step 1: Choose difficulty */}
            {!selectedDifficulty && (
              <DifficultyPicker
                onSelect={(difficulty) => setSelectedDifficulty(difficulty)}
              />
            )}

            {/* Step 2: Answer the question */}
            {selectedDifficulty && (
              <Card padding="lg" className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      difficultyConfig.find((d) => d.value === selectedDifficulty)?.badge
                    }`}
                  >
                    {difficultyConfig.find((d) => d.value === selectedDifficulty)?.label}
                  </span>
                </div>
                <p className="text-text-primary leading-relaxed">
                  Вопрос загружается...
                </p>
                {/* TODO: render actual question from server */}
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAttack(idx)}
                      className="w-full text-left p-3 rounded-xl border border-accent/15 bg-surface-light hover:border-accent/40 transition-all text-sm text-text-primary"
                    >
                      Вариант {idx + 1}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center space-y-4 pt-8">
            <div className="w-12 h-12 rounded-full border-2 border-accent-red/30 border-t-accent-red animate-spin mx-auto" />
            <p className="text-text-muted text-sm">
              Соперник выбирает вопрос...
            </p>
          </div>
        )}
      </div>
    );
  }

  // -- ROUND_DEFENSE phase --------------------------------------------------

  if (battle.phase === BattlePhase.ROUND_DEFENSE) {
    const isMyTurn = battle.currentDefenderId === battle.player1.id;
    const lastRound = battle.rounds[battle.rounds.length - 1];

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <ScoreBar battle={battle} />
        {disconnectBanner}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {isMyTurn ? "Защищайся!" : "Соперник защищается..."}
            </h2>
            <p className="text-text-muted text-sm">
              {isMyTurn
                ? "Выбери способ защиты от атаки"
                : "Ожидание решения соперника"}
            </p>
          </div>
          <TimerCircle seconds={seconds} progress={progress} />
        </div>

        {/* Attack info */}
        {lastRound && (
          <Card padding="sm" className="bg-accent-red/5 border-accent-red/15">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Атака:{" "}
                <span className="font-semibold text-text-primary">
                  {(lastRound.difficulty && difficultyLabels[lastRound.difficulty]) ?? lastRound.difficulty}
                </span>
              </span>
              <span className="text-sm">
                {lastRound.attackerCorrect ? (
                  <span className="text-accent-gold">Точная</span>
                ) : (
                  <span className="text-text-muted">Промах</span>
                )}
              </span>
            </div>
          </Card>
        )}

        {isMyTurn ? (
          <div className="space-y-3">
            {defenseConfig.map((d) => (
              <button
                key={d.value}
                onClick={() => defend(d.value)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${d.bg} ${d.border}`}
              >
                <div>
                  <span className={`font-semibold ${d.text}`}>{d.label}</span>
                  <p className="text-xs text-text-muted mt-0.5">{d.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center pt-8">
            <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto" />
          </div>
        )}
      </div>
    );
  }

  // -- ROUND_RESULT phase ---------------------------------------------------

  if (battle.phase === BattlePhase.ROUND_RESULT) {
    const lastRound = battle.rounds[battle.rounds.length - 1];

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <ScoreBar battle={battle} />

        <div className="text-center space-y-4 pt-4">
          <h2 className="text-xl font-bold">Результат раунда</h2>

          {lastRound && (
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Урон</span>
                <span className="text-sm font-bold text-accent-red">
                  {lastRound.damageDealt > 0
                    ? `-${lastRound.damageDealt} HP`
                    : "Промах"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Очки</span>
                <span className="text-sm font-bold text-accent-gold">
                  +{lastRound.pointsAwarded}
                </span>
              </div>
              {lastRound.defenseType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Защита</span>
                  <span
                    className={`text-sm font-semibold ${lastRound.defenseSuccess ? "text-accent" : "text-accent-red"}`}
                  >
                    {lastRound.defenseSuccess ? "Успех" : "Провал"}
                  </span>
                </div>
              )}
            </Card>
          )}
        </div>

        <p className="text-center text-text-muted text-sm">
          Следующий раунд начнётся автоматически...
        </p>
      </div>
    );
  }

  // -- SWAP_ROLES / WAITING / MATCHED — transient states --------------------

  return (
    <div className="px-4 pt-8 pb-24 space-y-6">
      <ScoreBar battle={battle} />
      {disconnectBanner}
      <div className="text-center pt-12 space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto" />
        <p className="text-text-muted text-sm">Подготовка...</p>
      </div>
    </div>
  );
}
