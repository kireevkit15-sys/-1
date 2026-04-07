"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BattlePhase,
  Difficulty,
  DefenseType,
  BattleMode,
} from "@razum/shared";
import type { BattleState, BattleRound, BattleResult } from "@razum/shared";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DifficultyPicker from "@/components/battle/DifficultyPicker";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_CATEGORIES = ["Стратегия", "Логика", "Философия"];

const difficultyLabels: Record<string, string> = {
  [Difficulty.BRONZE]: "Бронза",
  [Difficulty.SILVER]: "Серебро",
  [Difficulty.GOLD]: "Золото",
};

const MOCK_QUESTIONS: Record<string, { text: string; answers: string[] }> = {
  [Difficulty.BRONZE]: {
    text: "Какой древнегреческий философ основал Академию в Афинах?",
    answers: ["Платон", "Аристотель", "Сократ", "Диоген"],
  },
  [Difficulty.SILVER]: {
    text: "Является ли следующее утверждение логической ошибкой: «Все успешные люди встают рано, значит, чтобы быть успешным, нужно вставать рано»?",
    answers: [
      "Да, это ошибка корреляции",
      "Нет, это верная дедукция",
      "Да, это ошибка выживших",
      "Нет, это индуктивное рассуждение",
    ],
  },
  [Difficulty.GOLD]: {
    text: "В теории игр, каково равновесие Нэша в однократной «дилемме заключённого» для обоих рациональных игроков?",
    answers: [
      "Оба предают",
      "Оба сотрудничают",
      "Один предаёт, другой сотрудничает",
      "Равновесия не существует",
    ],
  },
};

function createMockBattle(): BattleState {
  return {
    id: "demo-battle",
    phase: BattlePhase.CATEGORY_SELECT,
    mode: BattleMode.SIEGE,
    player1: { id: "player", name: "Вы", score: 0, hp: 100 },
    player2: { id: "bot", name: "РАЗУМ-бот", score: 0, hp: 100 },
    currentRound: 1,
    totalRounds: 5,
    rounds: [],
    categories: MOCK_CATEGORIES,
    currentAttackerId: "player",
    currentDefenderId: "bot",
    timeLimit: 60,
    startedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Timer
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
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimit, active]);

  const progress = timeLimit > 0 ? seconds / timeLimit : 0;
  return { seconds, progress };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimerCircle({ seconds, progress }: { seconds: number; progress: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(207,157,123,0.15)" strokeWidth="3" />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={seconds <= 10 ? "#89352A" : "#CF9D7B"}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className={`absolute text-sm font-bold ${seconds <= 10 ? "text-accent-red" : "text-text-primary"}`}>
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
            <span className="text-xs font-bold text-accent">В</span>
          </div>
          <div>
            <p className="text-xs text-text-secondary">{battle.player1.name}</p>
            <p className="text-sm font-bold text-accent">{battle.player1.hp} HP</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-text-muted">Раунд {battle.currentRound}/{battle.totalRounds}</p>
          <div className="flex items-center gap-2 text-lg font-bold font-mono">
            <span className="text-accent">{battle.player1.score}</span>
            <span className="text-text-muted">:</span>
            <span className="text-accent-red">{battle.player2.score}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-text-secondary">{battle.player2.name}</p>
            <p className="text-sm font-bold text-accent-red">{battle.player2.hp} HP</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center border border-accent-red/15">
            <span className="text-xs font-bold text-accent-red">Б</span>
          </div>
        </div>
      </div>

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
// Difficulty / Defense configs
// ---------------------------------------------------------------------------

const difficultyConfig = [
  { value: Difficulty.BRONZE, label: "Бронза", desc: "Лёгкий вопрос, малый урон", damage: 10, tierClass: "tier-bronze", text: "text-accent-bronze", badge: "bg-accent-bronze/20 text-accent-bronze" },
  { value: Difficulty.SILVER, label: "Серебро", desc: "Средний вопрос, средний урон", damage: 20, tierClass: "tier-silver", text: "text-accent-silver", badge: "bg-accent-silver/15 text-accent-silver" },
  { value: Difficulty.GOLD, label: "Золото", desc: "Сложный вопрос, максимальный урон", damage: 35, tierClass: "tier-gold", text: "text-accent-gold", badge: "bg-accent-gold/20 text-accent-gold" },
];

const defenseConfig = [
  { value: DefenseType.ACCEPT, label: "Принять удар", desc: "Пропустить атаку без сопротивления", bg: "bg-text-muted/10", border: "border-text-muted/30", text: "text-text-muted" },
  { value: DefenseType.DISPUTE, label: "Оспорить", desc: "50% шанс отразить атаку", bg: "bg-accent/15", border: "border-accent/30", text: "text-accent" },
  { value: DefenseType.COUNTER, label: "Контратака", desc: "30% шанс, но отражает весь урон", bg: "bg-accent-gold/15", border: "border-accent-gold/30", text: "text-accent-gold" },
];

const defenseLabels: Record<string, string> = {
  [DefenseType.ACCEPT]: "Принять удар",
  [DefenseType.DISPUTE]: "Оспорить",
  [DefenseType.COUNTER]: "Контратака",
};

// ---------------------------------------------------------------------------
// Demo Page
// ---------------------------------------------------------------------------

export default function BattleDemoPage() {
  const router = useRouter();
  const [battle, setBattle] = useState<BattleState>(createMockBattle);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [lastRound, setLastRound] = useState<BattleRound | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [answerSelected, setAnswerSelected] = useState<number | null>(null);

  const timerActive =
    battle.phase === BattlePhase.ROUND_ATTACK ||
    battle.phase === BattlePhase.ROUND_DEFENSE;

  const { seconds, progress } = useCountdown(battle.timeLimit, timerActive);

  // -- Demo label -----------------------------------------------------------

  const demoBadge = (
    <div className="flex justify-center mb-4">
      <span className="text-xs px-3 py-1 rounded-full bg-accent-gold/15 text-accent-gold border border-accent-gold/20">
        ДЕМО-РЕЖИМ
      </span>
    </div>
  );

  // -- CATEGORY_SELECT ------------------------------------------------------

  if (battle.phase === BattlePhase.CATEGORY_SELECT) {
    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        {demoBadge}
        <ScoreBar battle={battle} />

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Выбери категорию</h2>
          <p className="text-text-muted text-sm">Атакуй вопросом из выбранной области</p>
        </div>

        <div className="space-y-3">
          {battle.categories.map((cat, idx) => {
            const styles = [
              "bg-accent-red/10 text-accent-red border-accent-red/25 hover:border-accent-red/50",
              "bg-accent-gold/10 text-accent-gold border-accent-gold/25 hover:border-accent-gold/50",
              "bg-accent/10 text-accent border-accent/25 hover:border-accent/50",
            ];
            return (
              <button
                key={cat}
                onClick={() => {
                  setBattle((b) => ({
                    ...b,
                    phase: BattlePhase.ROUND_ATTACK,
                    selectedCategory: cat,
                  }));
                  setSelectedDifficulty(null);
                  setAnswerSelected(null);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${styles[idx % styles.length]}`}
              >
                <span className="text-lg font-serif font-bold">{cat.charAt(0)}</span>
                <span className="font-semibold">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // -- ROUND_ATTACK ---------------------------------------------------------

  if (battle.phase === BattlePhase.ROUND_ATTACK) {
    const question = selectedDifficulty ? MOCK_QUESTIONS[selectedDifficulty] : null;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        {demoBadge}
        <ScoreBar battle={battle} />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Твоя атака</h2>
            <p className="text-text-muted text-sm">{battle.selectedCategory}</p>
          </div>
          <TimerCircle seconds={seconds} progress={progress} />
        </div>

        {/* Step 1: Choose difficulty */}
        {!selectedDifficulty && (
          <DifficultyPicker
            onSelect={(difficulty) => setSelectedDifficulty(difficulty)}
          />
        )}

        {/* Step 2: Answer */}
        {selectedDifficulty && question && (
          <Card padding="lg" className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${difficultyConfig.find((d) => d.value === selectedDifficulty)?.badge}`}>
                {difficultyConfig.find((d) => d.value === selectedDifficulty)?.label}
              </span>
            </div>
            <p className="text-text-primary leading-relaxed">{question.text}</p>
            <div className="space-y-2">
              {question.answers.map((ans, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (answerSelected !== null) return;
                    setAnswerSelected(idx);
                    const isCorrect = idx === 0; // first answer is always correct in demo
                    const dmg = difficultyConfig.find((d) => d.value === selectedDifficulty)?.damage ?? 10;

                    const round: BattleRound = {
                      roundNumber: battle.currentRound,
                      attackerId: "player",
                      defenderId: "bot",
                      difficulty: selectedDifficulty,
                      attackerAnswer: idx,
                      attackerCorrect: isCorrect,
                      damageDealt: isCorrect ? dmg : 0,
                      pointsAwarded: isCorrect ? dmg : 0,
                    };
                    setLastRound(round);

                    // Transition to defense phase after 1 sec
                    setTimeout(() => {
                      if (isCorrect) {
                        setBattle((b) => ({
                          ...b,
                          phase: BattlePhase.ROUND_DEFENSE,
                          currentAttackerId: "player",
                          currentDefenderId: "bot",
                        }));
                      } else {
                        // Missed — skip to result
                        setBattle((b) => ({
                          ...b,
                          phase: BattlePhase.ROUND_RESULT,
                          player1: { ...b.player1, score: b.player1.score },
                        }));
                      }
                    }, 1200);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                    answerSelected === null
                      ? "border-accent/15 bg-surface-light hover:border-accent/40 text-text-primary"
                      : answerSelected === idx
                        ? idx === 0
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : "border-accent-red/40 bg-accent-red/10 text-accent-red"
                        : idx === 0 && answerSelected !== null
                          ? "border-accent/30 bg-accent/5 text-accent"
                          : "border-accent/10 bg-surface-light text-text-muted opacity-50"
                  }`}
                >
                  {ans}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // -- ROUND_DEFENSE (bot defends — auto-simulate) --------------------------

  if (battle.phase === BattlePhase.ROUND_DEFENSE) {
    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        {demoBadge}
        <ScoreBar battle={battle} />

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Бот защищается...</h2>
            <p className="text-text-muted text-sm">Ожидание решения соперника</p>
          </div>
          <TimerCircle seconds={seconds} progress={progress} />
        </div>

        {lastRound && (
          <Card padding="sm" className="bg-accent/5 border-accent/15">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Твоя атака: <span className="font-semibold text-text-primary">{(lastRound.difficulty && difficultyLabels[lastRound.difficulty]) ?? lastRound.difficulty}</span>
              </span>
              <span className="text-sm text-accent-gold">Точная</span>
            </div>
          </Card>
        )}

        <div className="text-center pt-4">
          <div className="w-12 h-12 rounded-full border-2 border-accent-red/30 border-t-accent-red animate-spin mx-auto" />
          <p className="text-text-muted text-sm mt-4">Бот думает...</p>
        </div>

        {/* Auto-advance after 2 sec */}
        <BotAutoDefend
          onDone={(defenseType, success) => {
            const dmg = lastRound?.damageDealt ?? 0;
            const finalDmg = success ? 0 : dmg;
            setLastRound((r) =>
              r ? { ...r, defenseType, defenseSuccess: success, damageDealt: finalDmg } : r,
            );
            setBattle((b) => ({
              ...b,
              phase: BattlePhase.ROUND_RESULT,
              player2: { ...b.player2, hp: b.player2.hp - finalDmg },
              player1: { ...b.player1, score: b.player1.score + finalDmg },
            }));
          }}
        />
      </div>
    );
  }

  // -- ROUND_RESULT ---------------------------------------------------------

  if (battle.phase === BattlePhase.ROUND_RESULT && !result) {
    const isHit = lastRound && lastRound.damageDealt > 0;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        {demoBadge}
        <ScoreBar battle={battle} />

        <div className="text-center space-y-5 pt-2">
          {/* Big damage/miss indicator */}
          <div className="battle-slam">
            {isHit ? (
              <div className="inline-flex flex-col items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#89352A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-2">
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                  <path d="M13 19l6-6" />
                  <path d="M16 16l4 4" />
                  <path d="M19 21l2-2" />
                </svg>
                <span className="text-4xl font-bold text-accent-red font-mono">
                  -{lastRound!.damageDealt} HP
                </span>
              </div>
            ) : (
              <div className="inline-flex flex-col items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-2 text-text-muted">
                  <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
                </svg>
                <span className="text-3xl font-bold text-text-muted">Промах</span>
              </div>
            )}
          </div>

          {/* Stats cards */}
          {lastRound && (
            <div className="space-y-3">
              <Card padding="sm" className="battle-fade-up battle-stagger-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent-gold">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    <span className="text-sm text-text-secondary">Очки</span>
                  </div>
                  <span className="text-lg font-bold text-accent-gold font-mono">+{lastRound.pointsAwarded}</span>
                </div>
              </Card>

              <Card padding="sm" className="battle-fade-up battle-stagger-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-text-secondary">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    <span className="text-sm text-text-secondary">Атака</span>
                  </div>
                  <span className={`text-sm font-semibold ${lastRound.attackerCorrect ? "text-accent" : "text-accent-red"}`}>
                    {lastRound.attackerCorrect ? "Точный ответ" : "Неверный ответ"}
                  </span>
                </div>
              </Card>

              {lastRound.defenseType && (
                <Card padding="sm" className="battle-fade-up battle-stagger-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-text-secondary">
                        <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
                      </svg>
                      <span className="text-sm text-text-secondary">
                        {defenseLabels[lastRound.defenseType] ?? "Защита"}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${lastRound.defenseSuccess ? "text-accent" : "text-accent-red"}`}>
                      {lastRound.defenseSuccess ? "Отражено" : "Пробито"}
                    </span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 battle-fade-up battle-stagger-4">
          {battle.currentRound < battle.totalRounds && battle.player2.hp > 0 ? (
            <Button
              fullWidth
              onClick={() => {
                setBattle((b) => ({
                  ...b,
                  phase: BattlePhase.CATEGORY_SELECT,
                  currentRound: b.currentRound + 1,
                  currentAttackerId: "player",
                  currentDefenderId: "bot",
                  selectedCategory: undefined,
                }));
                setSelectedDifficulty(null);
                setAnswerSelected(null);
                setLastRound(null);
              }}
            >
              Следующий раунд
            </Button>
          ) : (
            <Button
              fullWidth
              onClick={() => {
                const p1 = battle.player1;
                const p2 = battle.player2;
                const winnerId = p1.score > p2.score ? p1.id : p2.score > p1.score ? p2.id : null;
                setResult({
                  winnerId,
                  player1Score: p1.score,
                  player2Score: p2.score,
                  xpGained: { player: p1.score * 2 },
                  ratingChange: winnerId === "player" ? 25 : winnerId === null ? 0 : -15,
                });
              }}
            >
              Результаты баттла
            </Button>
          )}
        </div>
      </div>
    );
  }

  // -- FINAL RESULT ---------------------------------------------------------

  if (result) {
    const isWin = result.winnerId === "player";
    const isDraw = result.winnerId === null;
    const ratingPositive = result.ratingChange > 0;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        {demoBadge}
        <div className="text-center space-y-4 pt-4">
          {/* Big result icon with glow */}
          <div className={`battle-slam ${isWin ? "battle-glow-gold" : isDraw ? "" : "battle-glow-red"}`}>
            {isWin ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-accent-gold mx-auto mb-2">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                <path d="M19 19H5a1 1 0 010-2h14a1 1 0 010 2z" />
              </svg>
            ) : isDraw ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-text-secondary mx-auto mb-2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-accent-red mx-auto mb-2">
                <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold battle-fade-up battle-stagger-1">
            {isWin ? "Победа!" : isDraw ? "Ничья" : "Поражение"}
          </h2>

          {/* Score comparison */}
          <div className="flex items-center justify-center gap-8 py-4 battle-fade-up battle-stagger-2">
            <div className="text-center">
              <p className="text-4xl font-bold text-accent font-mono">{result.player1Score}</p>
              <p className="text-xs text-text-muted mt-1">Вы</p>
            </div>
            <span className="text-text-muted text-3xl font-light">:</span>
            <div className="text-center">
              <p className="text-4xl font-bold text-accent-red font-mono">{result.player2Score}</p>
              <p className="text-xs text-text-muted mt-1">Бот</p>
            </div>
          </div>

          {/* Rewards */}
          <div className="space-y-3">
            <Card padding="sm" className="battle-fade-up battle-stagger-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent-gold">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                  <span className="text-sm text-text-secondary">Опыт</span>
                </div>
                <span className="text-lg font-bold text-accent-gold font-mono">
                  +{result.xpGained.player ?? 0} XP
                </span>
              </div>
            </Card>

            {result.ratingChange !== 0 && (
              <Card padding="sm" className="battle-fade-up battle-stagger-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${ratingPositive ? "text-accent" : "text-accent-red"}`}>
                      {ratingPositive ? (
                        <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                      ) : (
                        <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
                      )}
                    </svg>
                    <span className="text-sm text-text-secondary">Рейтинг</span>
                  </div>
                  <span className={`text-lg font-bold font-mono ${ratingPositive ? "text-accent" : "text-accent-red"}`}>
                    {ratingPositive ? "+" : ""}{result.ratingChange}
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-4 battle-fade-up battle-stagger-4">
          <Button
            fullWidth
            onClick={() => {
              setBattle(createMockBattle());
              setResult(null);
              setLastRound(null);
              setSelectedDifficulty(null);
              setAnswerSelected(null);
            }}
          >
            Играть снова
          </Button>
          <Button fullWidth variant="secondary" onClick={() => router.push("/")}>
            На главную
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: Bot auto-defense after 2 seconds
// ---------------------------------------------------------------------------

function BotAutoDefend({
  onDone,
}: {
  onDone: (defenseType: DefenseType, success: boolean) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const types = [DefenseType.ACCEPT, DefenseType.DISPUTE, DefenseType.COUNTER];
      const chosen = types[Math.floor(Math.random() * types.length)]!;
      const success =
        chosen === DefenseType.ACCEPT
          ? false
          : chosen === DefenseType.DISPUTE
            ? Math.random() < 0.5
            : Math.random() < 0.3;
      onDone(chosen, success);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return null;
}
