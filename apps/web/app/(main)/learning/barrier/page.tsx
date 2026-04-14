"use client";

/**
 * F24.1 — Экран барьер-испытания (оркестратор).
 * 5 этапов: Вспомни → Свяжи → Примени → Защити → Вердикт. Тёмно-бордовая
 * атмосфера (cold-blood aurora), отличается от обычных уроков. Пока бэкенд
 * барьера (L24, L22.3) не готов — страница в демо-режиме со стабами оценки.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BarrierProgress, {
  type BarrierStep,
} from "@/components/learning/barrier/BarrierProgress";
import RecallStage, {
  type RecallAnswer,
  type RecallQuestion,
  type RecallVerdict,
} from "@/components/learning/barrier/RecallStage";
import ConnectStage, {
  type ConceptPair,
  type ConnectAnswer,
  type ConnectVerdict,
} from "@/components/learning/barrier/ConnectStage";
import ApplyStage, {
  type ApplyAnswer,
  type ApplySituation,
  type ApplyVerdict,
} from "@/components/learning/barrier/ApplyStage";
import DefendStage, {
  type DefendMessage,
  type DefendOutcome,
  type DefendResult,
} from "@/components/learning/barrier/DefendStage";
import ResultScreen, {
  type WeakTopic,
} from "@/components/learning/barrier/ResultScreen";

// Демо-контент барьера для уровня "Наблюдатель"
const LEVEL_NAME = "Наблюдатель";

const RECALL_QUESTIONS: RecallQuestion[] = [
  { id: "r1", prompt: "Что такое порог достаточности в решении?" },
  { id: "r2", prompt: "Почему ожидание имеет свою цену?" },
  { id: "r3", prompt: "Чем стратег отличается от аналитика?" },
  { id: "r4", prompt: "Что значит «темп» в контексте решения?" },
  { id: "r5", prompt: "Какой главный вопрос задаёт решающий, а не собирающий?" },
  { id: "r6", prompt: "Почему 80% информации часто хуже 40%?" },
];

const CONCEPT_PAIRS: ConceptPair[] = [
  { id: "c1", left: "Порог достаточности", right: "Цена промедления" },
  { id: "c2", left: "Темп", right: "Обратимость решения" },
  { id: "c3", left: "Неполнота информации", right: "Субъектность" },
];

const APPLY_SITUATIONS: ApplySituation[] = [
  {
    id: "a1",
    scenario:
      "Тебе предложили возглавить новый отдел в компании, о которой ты знаешь лишь публичную часть. Решение нужно дать за сутки. Внутренняя кухня, реальные люди, политика — всё это ты узнаешь только изнутри.",
    concepts: ["Порог достаточности", "Цена промедления"],
  },
  {
    id: "a2",
    scenario:
      "Ты собирался уволиться через месяц, когда найдёшь новое место. Сегодня утром твой руководитель на совещании при всех сказал то, что перешло границу. Все ждут твоей реакции сейчас.",
    concepts: ["Обратимость решения", "Темп"],
  },
];

const DEFEND_STATEMENT =
  "Лучше решить на 40% информации сейчас, чем на 80% через неделю.";

// ── Стабы AI-оценки (до готовности L24) ────────────────────────────
async function recallGrade(
  _q: RecallQuestion,
  answer: string,
): Promise<RecallVerdict> {
  await new Promise((r) => setTimeout(r, 700));
  const w = answer.trim().split(/\s+/).filter(Boolean).length;
  if (w < 4) return "red";
  if (w < 12) return "yellow";
  return "green";
}

async function connectGrade(
  _pair: ConceptPair,
  answer: string,
): Promise<{ verdict: ConnectVerdict; feedback: string }> {
  await new Promise((r) => setTimeout(r, 800));
  const w = answer.trim().split(/\s+/).filter(Boolean).length;
  if (w < 5) {
    return {
      verdict: "missed",
      feedback:
        "Связи в этом нет — только пересказ. Попробуй показать, как одно влияет на другое.",
    };
  }
  if (w < 18) {
    return {
      verdict: "weak",
      feedback:
        "Связь намечена, но не раскрыта. Конкретизируй — через что они соприкасаются?",
    };
  }
  return {
    verdict: "strong",
    feedback:
      "Ясно. Ты показал механику взаимодействия, а не просто рядом их поставил.",
  };
}

async function applyGrade(
  _s: ApplySituation,
  answer: string,
): Promise<{ verdict: ApplyVerdict; feedback: string }> {
  await new Promise((r) => setTimeout(r, 900));
  const w = answer.trim().split(/\s+/).filter(Boolean).length;
  if (w < 15) {
    return {
      verdict: "missed",
      feedback:
        "Ответ общий. Не видно, что ты примерил концепты к этой конкретной ситуации.",
    };
  }
  if (w < 40) {
    return {
      verdict: "partial",
      feedback:
        "Применил один концепт, но второй висит в воздухе. Добавь его в рассуждение.",
    };
  }
  return {
    verdict: "applied",
    feedback:
      "Оба концепта работают в твоём рассуждении. Решение обосновано, а не случайно.",
  };
}

async function defendNextChallenge(
  transcript: DefendMessage[],
): Promise<string> {
  await new Promise((r) => setTimeout(r, 900));
  const round = transcript.filter((m) => m.role === "mentor").length;
  const challenges = [
    "А если цена ошибки при 40% выше, чем цена промедления? Твоё «лучше» — универсальное или ситуативное?",
    "Ты сказал — «решить». Но решение без полного анализа — это игра, а не стратегия. Где проходит твоя граница?",
    "Хорошо. Тогда объясни: что мешает собрать эти 80% за несколько часов, а не за неделю? Не прикрываешься ли ты занятостью?",
    "Последнее. Ты сам применил бы это правило, если бы речь шла о здоровье близкого?",
  ];
  return challenges[Math.min(round, challenges.length - 1)] ?? challenges[0]!;
}

async function defendGrade(
  transcript: DefendMessage[],
): Promise<{ outcome: DefendOutcome; summary: string }> {
  await new Promise((r) => setTimeout(r, 1000));
  const userTurns = transcript.filter((m) => m.role === "user");
  const avgLen =
    userTurns.reduce((s, m) => s + m.text.trim().split(/\s+/).length, 0) /
    Math.max(1, userTurns.length);
  if (avgLen < 10) {
    return {
      outcome: "lost",
      summary:
        "Ты не защищал — ты уступал. Позиция держится только тогда, когда за ней стоит работа.",
    };
  }
  if (avgLen < 25) {
    return {
      outcome: "wavered",
      summary:
        "Ты дрогнул, но не упал. В следующий раз — держи линию через конкретику, не через общие формулы.",
    };
  }
  return {
    outcome: "held",
    summary:
      "Ты удержал позицию под давлением и уточнил её, не сломав. Это и есть защита — а не упрямство.",
  };
}

// ── Возможные слабые темы (для failed-вердикта) ───────────────────
const WEAK_TOPICS_POOL: WeakTopic[] = [
  { id: "t1", title: "Порог достаточности", hint: "повторить" },
  { id: "t2", title: "Цена промедления", hint: "переосмыслить" },
  { id: "t3", title: "Обратимость решения", hint: "повторить" },
];

type Phase =
  | { kind: "recall" }
  | { kind: "connect" }
  | { kind: "apply" }
  | { kind: "defend" }
  | { kind: "verdict"; passed: boolean; weak: WeakTopic[] };

export default function BarrierPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "recall" });
  const [recallScore, setRecallScore] = useState(0);
  const [connectScore, setConnectScore] = useState(0);
  const [applyScore, setApplyScore] = useState(0);

  const { currentStep, completedSteps } = useMemo(() => {
    const order: BarrierStep[] = [
      "recall",
      "connect",
      "apply",
      "defend",
      "verdict",
    ];
    const cur: BarrierStep =
      phase.kind === "verdict" ? "verdict" : phase.kind;
    const idx = order.indexOf(cur);
    return {
      currentStep: cur,
      completedSteps: order.slice(0, idx),
    };
  }, [phase]);

  const handleRecallComplete = (answers: RecallAnswer[]) => {
    const green = answers.filter((a) => a.verdict === "green").length;
    setRecallScore(green);
    setPhase({ kind: "connect" });
  };

  const handleConnectComplete = (answers: ConnectAnswer[]) => {
    const strong = answers.filter((a) => a.verdict === "strong").length;
    setConnectScore(strong);
    setPhase({ kind: "apply" });
  };

  const handleApplyComplete = (answers: ApplyAnswer[]) => {
    const applied = answers.filter((a) => a.verdict === "applied").length;
    setApplyScore(applied);
    setPhase({ kind: "defend" });
  };

  const handleDefendComplete = (result: DefendResult) => {
    // Итоговая логика: нужно набрать достаточно по всем этапам.
    // recall ≥ 4/6, connect ≥ 2/3, apply ≥ 1/2, defend != lost.
    const passed =
      recallScore >= 4 &&
      connectScore >= 2 &&
      applyScore >= 1 &&
      result.outcome !== "lost";
    const weak: WeakTopic[] = passed
      ? []
      : [
          ...(recallScore < 4 ? [WEAK_TOPICS_POOL[0]!] : []),
          ...(connectScore < 2 ? [WEAK_TOPICS_POOL[1]!] : []),
          ...(applyScore < 1 ? [WEAK_TOPICS_POOL[2]!] : []),
        ];
    setPhase({ kind: "verdict", passed, weak });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Бордовая aurora — отличает барьер от обычного урока */}
      <div
        className="pointer-events-none fixed -top-40 -left-40 w-[560px] h-[560px] rounded-full blur-[140px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(139,46,46,0.35) 0%, rgba(139,46,46,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none fixed -bottom-40 -right-32 w-[520px] h-[520px] rounded-full blur-[140px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(107,125,140,0.18) 0%, rgba(107,125,140,0) 70%)",
          animationDelay: "-9s",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        {/* Заголовок */}
        {phase.kind !== "verdict" && (
          <header className="text-center mb-10 sm:mb-14 animate-[slide-up_0.5s_ease-out]">
            <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-blood mb-4">
              — Испытание —
            </div>
            <h1 className="font-ritual text-xl sm:text-2xl tracking-[0.2em] uppercase text-text-primary mb-3">
              Уровень {LEVEL_NAME}
            </h1>
            <p className="font-verse italic text-text-secondary">Докажи.</p>
          </header>
        )}

        {/* Прогресс */}
        {phase.kind !== "verdict" && (
          <div className="mb-12 sm:mb-16">
            <BarrierProgress
              currentStep={currentStep}
              completedSteps={completedSteps}
            />
          </div>
        )}

        {/* Этапы */}
        {phase.kind === "recall" && (
          <RecallStage
            questions={RECALL_QUESTIONS}
            grade={recallGrade}
            onComplete={handleRecallComplete}
          />
        )}
        {phase.kind === "connect" && (
          <ConnectStage
            pairs={CONCEPT_PAIRS}
            grade={connectGrade}
            onComplete={handleConnectComplete}
          />
        )}
        {phase.kind === "apply" && (
          <ApplyStage
            situations={APPLY_SITUATIONS}
            grade={applyGrade}
            onComplete={handleApplyComplete}
          />
        )}
        {phase.kind === "defend" && (
          <DefendStage
            initialStatement={DEFEND_STATEMENT}
            maxRounds={4}
            nextChallenge={defendNextChallenge}
            grade={defendGrade}
            onComplete={handleDefendComplete}
          />
        )}
        {phase.kind === "verdict" && (
          <ResultScreen
            outcome={phase.passed ? "passed" : "failed"}
            levelName={LEVEL_NAME}
            primaryAction={
              phase.passed
                ? {
                    label: "Продолжить путь",
                    onClick: () => router.push("/learning"),
                  }
                : {
                    label: "Вернуться к повторению",
                    onClick: () => router.push("/learning"),
                  }
            }
            secondaryAction={
              phase.passed
                ? {
                    label: "В бой",
                    onClick: () => router.push("/battle"),
                  }
                : undefined
            }
            weakTopics={phase.weak}
          />
        )}
      </div>
    </div>
  );
}
