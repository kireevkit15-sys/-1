"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBattle } from "@/hooks/useBattle";
import { BattlePhase, Difficulty, DefenseType, Branch } from "@razum/shared";
import { playBattleStart, playSelect, playCorrect, playWrong, playTick, playVictory, playDefeat, playDamage } from "@/lib/sounds";
import type { BattleState } from "@razum/shared";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DifficultyPicker from "@/components/battle/DifficultyPicker";
import QuestionSourceIndicator from "@/components/battle/QuestionSourceIndicator";
import { API_BASE } from "@/lib/api/base";

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
        const next = s - 1;
        if (next > 0 && next < 10) playTick();
        return next;
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
  const isCritical = pct <= 20;
  const barColor = color === "accent"
    ? "bg-gradient-to-r from-cold-steel to-accent-red"
    : "bg-gradient-to-r from-cold-blood to-accent-orange";
  return (
    <div className="h-3 w-full bg-surface-light rounded-none border-2 border-cold-steel/40 overflow-hidden mt-1">
      <div
        className={`h-full rounded-none transition-all duration-500 ${barColor}${isCritical ? " battle-pulse-hp" : ""}`}
        style={{ width: `${pct}%` }}
      />
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

        <div className="text-center flex flex-col items-center">
          <span className="overline">Раунд {battle.currentRound}/{battle.totalRounds}</span>
          <div className="flex items-center gap-2 text-2xl font-black font-mono tabular-nums tracking-tight">
            <span className="text-accent">{battle.player1.score}</span>
            <span className="text-accent-red text-3xl">:</span>
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
// Branch config for CATEGORY_SELECT
// ---------------------------------------------------------------------------

const BRANCH_CONFIG = [
  {
    key: "STRATEGY",
    label: "Стратегия",
    cssClass: "branch-strategy",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" aria-hidden="true">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
        <path d="M19 19H5a1 1 0 010-2h14a1 1 0 010 2z" />
      </svg>
    ),
  },
  {
    key: "LOGIC",
    label: "Логика",
    cssClass: "branch-logic",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" aria-hidden="true">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M8 6h4M14 6h2M8 18h4M14 18h2M6 8v4M6 14v2M18 8v4M18 14v2M10 12h4" />
      </svg>
    ),
  },
  {
    key: "ERUDITION",
    label: "Эрудиция",
    cssClass: "branch-erudition",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    key: "RHETORIC",
    label: "Риторика",
    cssClass: "branch-rhetoric",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" aria-hidden="true">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    key: "INTUITION",
    label: "Интуиция",
    cssClass: "branch-intuition",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
] as const;

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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    ),
  },
  {
    value: DefenseType.DISPUTE,
    label: "Оспорить",
    desc: "50% шанс отразить атаку",
    bg: "bg-accent/15",
    border: "border-accent/30",
    text: "text-accent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
      </svg>
    ),
  },
  {
    value: DefenseType.COUNTER,
    label: "Контратака",
    desc: "30% шанс, но отражает весь урон",
    bg: "bg-accent-gold/15",
    border: "border-accent-gold/30",
    text: "text-accent-gold",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// CountUpNumber component — animates from 0 to target value
// ---------------------------------------------------------------------------

function CountUpNumber({ target, className }: { target: number; className?: string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (target === 0) { setDisplayed(0); return; }
    const duration = 600; // ms
    const steps = 20;
    const stepMs = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setDisplayed(Math.round((target * step) / steps));
      if (step >= steps) clearInterval(timer);
    }, stepMs);
    return () => clearInterval(timer);
  }, [target]);

  return <span className={className}>{displayed}</span>;
}

// ---------------------------------------------------------------------------
// FloatingXP component
// ---------------------------------------------------------------------------

function FloatingXP({ xp }: { xp: number }) {
  return (
    <span
      className="float-number text-accent-gold select-none"
      style={{ left: "50%", transform: "translateX(-50%)", bottom: "100%", marginBottom: "4px" }}
      aria-hidden="true"
    >
      +{xp} XP
    </span>
  );
}

// ---------------------------------------------------------------------------
// Victory particles
// ---------------------------------------------------------------------------

const PARTICLE_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const PARTICLE_COLORS = ["#CF9D7B", "#B98D34", "#E8C89E", "#89352A", "#CF9D7B", "#B98D34"];

function VictoryParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {PARTICLE_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const distance = 60 + (i % 3) * 20;
        const tx = Math.cos(rad) * distance;
        const ty = Math.sin(rad) * distance;
        const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        const size = 6 + (i % 3) * 2;
        const delay = (i % 4) * 0.08;
        return (
          <div
            key={angle}
            className="absolute rounded-full animate-particle-burst"
            style={{
              width: size,
              height: size,
              background: color,
              top: "50%",
              left: "50%",
              marginTop: -size / 2,
              marginLeft: -size / 2,
              transform: `translate(${tx}px, ${ty}px)`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

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
    selectBranch,
    selectCategory,
    attack,
    defend,
    reset,
    disconnect,
  } = useBattle(params.id);

  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty | null>(null);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [floatingXp, setFloatingXp] = useState<number | null>(null);

  // Question loading for attack phase
  interface BattleQuestion {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    category: string;
    difficulty: string;
  }
  const [currentQuestion, setCurrentQuestion] = useState<BattleQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const questionFetchedRef = useRef<string>("");  // "branch:difficulty" to avoid re-fetch
  const usedQuestionIdsRef = useRef<string[]>([]);  // track used question IDs to avoid repeats

  const timerActive =
    !!battle &&
    (battle.phase === BattlePhase.ROUND_ATTACK ||
      battle.phase === BattlePhase.ROUND_DEFENSE);

  const { seconds, progress } = useCountdown(
    battle?.timeLimit ?? 60,
    timerActive,
  );

  // Play battle start sound on first round
  const battleStartPlayed = useRef(false);
  useEffect(() => {
    if (battle && !battleStartPlayed.current) {
      battleStartPlayed.current = true;
      playBattleStart();
    }
  }, [battle]);

  // Play victory/defeat sound when battle finishes; show total XP
  useEffect(() => {
    if (status === "finished" && result && battle) {
      const isWin = result.winnerId === battle.player1.id;
      const isDraw = result.winnerId === null;
      if (isWin) playVictory();
      else if (!isDraw) playDefeat();
      const xp = result.xpGained[battle.player1.id];
      if (xp != null && xp > 0) {
        setFloatingXp(xp);
        const t = setTimeout(() => setFloatingXp(null), 1200);
        return () => clearTimeout(t);
      }
    }
  }, [status, result, battle]);

  // Play correct/wrong sound when round result is revealed; shake on miss, play damage on hit
  useEffect(() => {
    if (battle?.phase === BattlePhase.ROUND_RESULT) {
      const lastRound = battle.rounds[battle.rounds.length - 1];
      if (lastRound) {
        if (lastRound.attackerCorrect && lastRound.attackerId === battle.player1.id) {
          playCorrect();
        } else if (!lastRound.attackerCorrect && lastRound.attackerId === battle.player1.id) {
          playWrong();
          // Shake screen on wrong answer (miss)
          setShakeScreen(true);
          setTimeout(() => setShakeScreen(false), 600);
        }
        // Play damage sound when damage was dealt (regardless of attacker)
        if (lastRound.damageDealt > 0) {
          playDamage();
          // Also shake on taking damage as defender
          if (lastRound.attackerId !== battle.player1.id) {
            setShakeScreen(true);
            setTimeout(() => setShakeScreen(false), 600);
          }
        }
      }
    }
  }, [battle?.phase, battle?.rounds, battle?.player1?.id]);

  // Reset difficulty selection and question when phase changes
  useEffect(() => {
    setSelectedDifficulty(null);
    setCurrentQuestion(null);
    questionFetchedRef.current = "";
  }, [battle?.phase, battle?.currentRound]);

  // Fetch question when difficulty is selected
  useEffect(() => {
    if (!selectedDifficulty || !battle) return;
    if (battle.phase !== BattlePhase.ROUND_ATTACK) return;
    if (battle.currentAttackerId !== battle.player1.id) return;

    const branch = battle.selectedBranch || "STRATEGY";
    const fetchKey = `${branch}:${selectedDifficulty}:${battle.currentRound}`;
    if (questionFetchedRef.current === fetchKey) return;
    questionFetchedRef.current = fetchKey;

    async function loadQuestion() {
      setQuestionLoading(true);
      try {
        const excludeParam = usedQuestionIdsRef.current.length > 0
          ? `&excludeIds=${usedQuestionIdsRef.current.join(',')}`
          : '';
        const res = await fetch(
          `${API_BASE}/questions/random?branch=${branch}&difficulty=${selectedDifficulty}&count=1${excludeParam}&_t=${Date.now()}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const questions = await res.json();
          if (Array.isArray(questions) && questions.length > 0) {
            const q = questions[0];
            usedQuestionIdsRef.current.push(q.id);
            setCurrentQuestion(q);
          }
        }
      } catch (e) {
        console.error("Failed to load question", e);
      } finally {
        setQuestionLoading(false);
      }
    }
    loadQuestion();
  }, [selectedDifficulty, battle?.phase, battle?.currentRound, battle?.selectedBranch, battle?.currentAttackerId, battle?.player1?.id]);

  // Trigger floating XP on ROUND_RESULT when points were awarded
  useEffect(() => {
    if (battle?.phase === BattlePhase.ROUND_RESULT) {
      const lastRound = battle.rounds[battle.rounds.length - 1];
      if (lastRound && lastRound.pointsAwarded > 0) {
        setFloatingXp(lastRound.pointsAwarded);
        const t = setTimeout(() => setFloatingXp(null), 1200);
        return () => clearTimeout(t);
      }
    }
  }, [battle?.phase, battle?.rounds]);

  const handleAttack = useCallback(
    (answerIndex: number) => {
      if (!selectedDifficulty || !currentQuestion) return;
      attack(selectedDifficulty, answerIndex, currentQuestion.id);
    },
    [selectedDifficulty, currentQuestion, attack],
  );

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts: 1-4 answers, 1-3 defense, Esc exit
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Esc — exit battle
      if (e.key === "Escape") {
        e.preventDefault();
        disconnect();
        router.push("/");
        return;
      }

      if (!battle) return;

      const numKey = parseInt(e.key, 10);
      const isNum = numKey >= 1 && numKey <= 9;

      // BRANCH_SELECT — 1..5 selects branch
      if (battle.phase === BattlePhase.BRANCH_SELECT) {
        const isMyTurn = battle.currentAttackerId === battle.player1.id;
        const allBranches = [Branch.STRATEGY, Branch.LOGIC, Branch.ERUDITION, Branch.RHETORIC, Branch.INTUITION];
        const availBranches = battle.branches?.length ? battle.branches : allBranches;
        if (isMyTurn && isNum && numKey <= availBranches.length) {
          const branch = availBranches[numKey - 1];
          if (branch) {
            e.preventDefault();
            playSelect();
            selectBranch(branch);
          }
        }
        return;
      }

      // CATEGORY_SELECT — 1..5 selects branch card by visible order
      if (battle.phase === BattlePhase.CATEGORY_SELECT) {
        const isMyTurn = battle.currentAttackerId === battle.player1.id;
        const visibleBranches = BRANCH_CONFIG.filter(b => battle.categories.includes(b.key));
        const branch = visibleBranches[numKey - 1];
        if (isMyTurn && isNum && numKey <= visibleBranches.length && branch) {
          e.preventDefault();
          playSelect();
          selectCategory(branch.key);
        }
        return;
      }

      // ROUND_ATTACK — select difficulty with 1-3, then answer with 1-4
      if (battle.phase === BattlePhase.ROUND_ATTACK) {
        const isMyTurn = battle.currentAttackerId === battle.player1.id;
        if (!isMyTurn) return;

        if (!selectedDifficulty) {
          const diff = difficultyConfig[numKey - 1];
          if (isNum && numKey >= 1 && numKey <= 3 && diff) {
            e.preventDefault();
            playSelect();
            setSelectedDifficulty(diff.value);
          }
        } else {
          if (isNum && numKey >= 1 && numKey <= 4) {
            e.preventDefault();
            playSelect();
            handleAttack(numKey - 1);
          }
        }
        return;
      }

      // ROUND_DEFENSE — 1-3 selects defense type
      if (battle.phase === BattlePhase.ROUND_DEFENSE) {
        const isMyTurn = battle.currentDefenderId === battle.player1.id;
        const def = defenseConfig[numKey - 1];
        if (isMyTurn && isNum && numKey >= 1 && numKey <= 3 && def) {
          e.preventDefault();
          playSelect();
          defend(def.value);
        }
        return;
      }

      // FINISHED — Enter for new battle
      if (status === "finished" && e.key === "Enter") {
        e.preventDefault();
        disconnect();
        router.push("/battle/new");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [battle, selectedDifficulty, status, disconnect, router, selectBranch, selectCategory, defend, handleAttack]);

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
    const ratingPositive = result.ratingChange > 0;

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <div className="text-center space-y-4 pt-4">
          {/* Big result icon with glow */}
          <div className={`battle-slam ${isWin ? "battle-glow-gold" : isDraw ? "" : "battle-glow-red"}`}>
            {isWin ? (
              <div className="relative inline-flex flex-col items-center">
                <VictoryParticles />
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-accent-gold mb-2">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                  <path d="M19 19H5a1 1 0 010-2h14a1 1 0 010 2z" />
                </svg>
              </div>
            ) : isDraw ? (
              <div className="inline-flex flex-col items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-text-secondary mb-2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8" strokeLinecap="round" />
                </svg>
              </div>
            ) : (
              <div className="inline-flex flex-col items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-accent-red mb-2">
                  <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            )}
          </div>

          <h2
            className={`text-4xl font-black uppercase tracking-[0.08em] battle-slam ${
              isWin ? "text-accent-gold battle-glow-gold" : isDraw ? "text-text-secondary" : "text-cold-blood battle-glow-red"
            }`}
          >
            {isWin ? "Победа" : isDraw ? "Ничья" : "Поражение"}
          </h2>

          {/* Score comparison */}
          <div className="flex items-center justify-center gap-8 py-4 battle-fade-up battle-stagger-2">
            <div className="text-center">
              <p className="text-4xl font-bold text-accent font-mono">
                {result.player1Score}
              </p>
              <p className="text-xs text-text-muted mt-1">Вы</p>
            </div>
            <span className="text-text-muted text-3xl font-light">:</span>
            <div className="text-center">
              <p className="text-4xl font-bold text-accent-red font-mono">
                {result.player2Score}
              </p>
              <p className="text-xs text-text-muted mt-1">Соперник</p>
            </div>
          </div>

          {/* Rewards */}
          <div className="space-y-3">
            {/* XP gained */}
            {battle && result.xpGained[battle.player1.id] != null && (
              <div className="relative">
                {floatingXp !== null && <FloatingXP xp={floatingXp} />}
                <Card padding="sm" className="battle-fade-up battle-stagger-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent-gold">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                      </svg>
                      <span className="text-sm text-text-secondary">Опыт</span>
                    </div>
                    <span className="text-lg font-bold text-accent-gold font-mono">
                      +{result.xpGained[battle.player1.id]} XP
                    </span>
                  </div>
                </Card>
              </div>
            )}

            {/* Rating change */}
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

  // -- BRANCH_SELECT phase --------------------------------------------------

  if (battle.phase === BattlePhase.BRANCH_SELECT) {
    const isMyTurn = battle.currentAttackerId === battle.player1.id;

    const branchConfig: { value: Branch; label: string; color: string; icon: string }[] = [
      { value: Branch.STRATEGY, label: "Стратегия", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/25 hover:border-cyan-400/50", icon: "♟" },
      { value: Branch.LOGIC, label: "Логика", color: "text-green-400 bg-green-400/10 border-green-400/25 hover:border-green-400/50", icon: "⚙" },
      { value: Branch.ERUDITION, label: "Эрудиция", color: "text-purple-400 bg-purple-400/10 border-purple-400/25 hover:border-purple-400/50", icon: "📚" },
      { value: Branch.RHETORIC, label: "Риторика", color: "text-orange-400 bg-orange-400/10 border-orange-400/25 hover:border-orange-400/50", icon: "🗣" },
      { value: Branch.INTUITION, label: "Интуиция", color: "text-pink-400 bg-pink-400/10 border-pink-400/25 hover:border-pink-400/50", icon: "✨" },
    ];

    const availableBranches = branchConfig.filter(
      (b) => !battle.branches || battle.branches.includes(b.value)
    );

    return (
      <div className="px-4 pt-8 pb-24 space-y-6">
        <ScoreBar battle={battle} />
        {disconnectBanner}

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">
            {isMyTurn ? "Выбери ветку атаки" : "Соперник выбирает ветку..."}
          </h2>
          <p className="text-text-muted text-sm">
            {isMyTurn
              ? "Атакуй вопросом из выбранной ветки знаний"
              : "Приготовься к защите"}
          </p>
        </div>

        {isMyTurn ? (
          <div className="space-y-3">
            {availableBranches.map((b, idx) => (
              <button
                key={b.value}
                onClick={() => { playSelect(); selectBranch(b.value); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${b.color}`}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="font-semibold text-lg">{b.label}</span>
                <span className="ml-auto hidden md:inline-flex w-6 h-6 items-center justify-center rounded-md bg-surface-light/40 text-xs font-mono text-text-muted">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center pt-8">
            <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
        )}
      </div>
    );
  }

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
            {(() => {
              const visibleBranches = BRANCH_CONFIG.filter(b => battle.categories.includes(b.key));
              return visibleBranches.map((branch, visIdx) => (
                <button
                  key={branch.key}
                  onClick={() => { playSelect(); selectCategory(branch.key); }}
                  className={`${branch.cssClass} branch-card hover-branch-glow w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]`}
                >
                  {/* Keyboard hint */}
                  <span className="hidden md:inline-flex w-6 h-6 flex-shrink-0 items-center justify-center rounded-md bg-surface-light/60 text-xs font-mono text-text-muted">
                    {visIdx + 1}
                  </span>
                  {/* Icon */}
                  <span className="branch-icon flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center">
                    {branch.icon}
                  </span>
                  {/* Label */}
                  <span className="font-semibold text-base" style={{ color: "var(--branch-hex)" }}>
                    {branch.label}
                  </span>
                </button>
              ));
            })()}
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
        <QuestionSourceIndicator />
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
                  {battle.selectedBranch && (
                    <span className="text-xs text-text-muted px-2 py-0.5 rounded bg-surface-light">
                      {battle.selectedBranch}
                    </span>
                  )}
                </div>

                {questionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : currentQuestion ? (
                  <>
                    <p className="text-text-primary leading-relaxed">
                      {currentQuestion.text}
                    </p>
                    <div className="space-y-2">
                      {currentQuestion.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => { playSelect(); handleAttack(idx); }}
                          aria-keyshortcuts={String(idx + 1)}
                          className="w-full text-left p-4 min-h-[56px] rounded-none border border-accent/15 bg-surface-light hover:border-accent/40 transition-all text-sm text-text-primary flex items-center gap-3 active:scale-[0.98]"
                        >
                          <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md bg-surface/60 text-xs font-mono text-text-muted border border-accent/10">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{opt}</span>
                          <span className="hidden md:inline-flex w-6 h-6 items-center justify-center rounded-md bg-surface-light/60 text-xs font-mono text-text-muted">
                            {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-text-muted text-center py-4">
                    Нет доступных вопросов для этой ветки
                  </p>
                )}
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
            {defenseConfig.map((d, i) => (
              <button
                key={d.value}
                onClick={() => { playSelect(); defend(d.value); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] battle-fade-up battle-stagger-${i + 1} ${d.bg} ${d.border}`}
              >
                <span className="hidden md:inline-flex w-6 h-6 flex-shrink-0 items-center justify-center rounded-md bg-surface-light/40 text-xs font-mono text-text-muted">
                  {i + 1}
                </span>
                <div className={`flex-shrink-0 ${d.text}`}>
                  {d.icon}
                </div>
                <div className="text-left">
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
    const isHit = lastRound && lastRound.damageDealt > 0;

    return (
      <div className={`px-4 pt-8 pb-24 space-y-6${shakeScreen ? " battle-shake" : ""}`}>
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
                  -<CountUpNumber target={lastRound!.damageDealt} /> HP
                </span>
              </div>
            ) : (
              <div className="inline-flex flex-col items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-2 text-text-muted">
                  <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
                </svg>
                <span className="text-3xl font-bold text-text-muted">
                  Промах
                </span>
              </div>
            )}
          </div>

          {/* Answer result highlighting */}
          {lastRound && lastRound.attackerAnswer !== undefined && (
            <div className="space-y-2">
              <p className="overline">Ответы</p>
              {[0, 1, 2, 3].map((idx) => {
                const isPlayerChoice = idx === lastRound.attackerAnswer;
                const isCorrect = isPlayerChoice && lastRound.attackerCorrect;
                const isWrong = isPlayerChoice && !lastRound.attackerCorrect;
                if (!isPlayerChoice) return null;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl border text-sm font-medium"
                    style={
                      isCorrect
                        ? { borderColor: "#22C55E", backgroundColor: "rgba(34,197,94,0.08)", color: "#22C55E" }
                        : isWrong
                        ? { borderColor: "#C0392B", backgroundColor: "rgba(192,57,43,0.08)", color: "#C0392B" }
                        : {}
                    }
                  >
                    {isCorrect ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 flex-shrink-0">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                    <span>Вариант {idx + 1} — {isCorrect ? "Верно" : "Неверно"}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats cards */}
          {lastRound && (
            <div className="space-y-3">
              {/* Points earned */}
              <div className="relative">
                {floatingXp !== null && <FloatingXP xp={floatingXp} />}
                <Card padding="sm" className="battle-fade-up battle-stagger-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent-gold">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                      </svg>
                      <span className="text-sm text-text-secondary">Очки</span>
                    </div>
                    <span className="text-lg font-bold text-accent-gold font-mono">
                      +<CountUpNumber target={lastRound.pointsAwarded} />
                    </span>
                  </div>
                </Card>
              </div>

              {/* Attack accuracy */}
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

              {/* Defense outcome */}
              {lastRound.defenseType && (
                <Card padding="sm" className="battle-fade-up battle-stagger-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-text-secondary">
                        <path d="M12 2L3 7v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V7l-9-5z" />
                      </svg>
                      <span className="text-sm text-text-secondary">
                        {defenseConfig.find(d => d.value === lastRound.defenseType)?.label ?? "Защита"}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${lastRound.defenseSuccess ? "text-accent" : "text-accent-red"}`}>
                      {lastRound.defenseSuccess ? "Отражено" : "Пробито"}
                    </span>
                  </div>
                </Card>
              )}

              {/* Difficulty badge */}
              {lastRound.difficulty && (
                <Card padding="sm" className="battle-fade-up battle-stagger-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Сложность</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${difficultyConfig.find(d => d.value === lastRound.difficulty)?.badge}`}>
                      {difficultyConfig.find(d => d.value === lastRound.difficulty)?.label}
                    </span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-text-muted text-sm battle-fade-up" style={{ animationDelay: "0.7s", opacity: 0 }}>
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
