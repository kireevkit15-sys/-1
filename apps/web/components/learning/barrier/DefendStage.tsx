"use client";

/**
 * F24.5 — DefendStage
 * Этап барьер-испытания "Защити": чат с AI-наставником, 3-4 раунда давления.
 * Пользователь защищает свою начальную позицию, наставник формулирует
 * возражения. После финального ответа — вердикт: held / wavered / lost.
 */

import { useEffect, useRef, useState } from "react";

export type DefendRole = "mentor" | "user";

export interface DefendMessage {
  id: string;
  role: DefendRole;
  text: string;
}

export type DefendOutcome = "held" | "wavered" | "lost";

export interface DefendResult {
  outcome: DefendOutcome;
  summary: string;
  transcript: DefendMessage[];
}

export interface DefendStageProps {
  /** Начальная позиция пользователя (утверждение, которое нужно защитить). */
  initialStatement: string;
  /** Максимальное число раундов давления (3 или 4). Дефолт 4. */
  maxRounds?: number;
  /** Получить следующий ход наставника по текущему транскрипту. */
  nextChallenge: (transcript: DefendMessage[]) => Promise<string>;
  /** Итоговая оценка после финального ответа пользователя. */
  grade: (
    transcript: DefendMessage[],
  ) => Promise<{ outcome: DefendOutcome; summary: string }>;
  onComplete: (result: DefendResult) => void;
}

type Phase =
  | "mentor-thinking"
  | "user-turn"
  | "grading"
  | "done";

function makeId(prefix: string, n: number): string {
  return `${prefix}-${n}-${Date.now().toString(36)}`;
}

export function DefendStage({
  initialStatement,
  maxRounds = 4,
  nextChallenge,
  grade,
  onComplete,
}: DefendStageProps) {
  const [transcript, setTranscript] = useState<DefendMessage[]>(() => [
    {
      id: makeId("anchor", 0),
      role: "user",
      text: initialStatement,
    },
  ]);
  const [round, setRound] = useState(1); // текущий раунд давления (наставник)
  const [phase, setPhase] = useState<Phase>("mentor-thinking");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);

  // Автоскролл к последнему сообщению.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, phase]);

  // Первый вызов nextChallenge при монтировании.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void requestChallenge([
      {
        id: makeId("anchor", 0),
        role: "user",
        text: initialStatement,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestChallenge(current: DefendMessage[]) {
    setPhase("mentor-thinking");
    setError(null);
    try {
      const text = await nextChallenge(current);
      const msg: DefendMessage = {
        id: makeId("mentor", current.length),
        role: "mentor",
        text,
      };
      setTranscript([...current, msg]);
      setPhase("user-turn");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Наставник молчит");
      setPhase("user-turn");
    }
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || phase !== "user-turn") return;

    const userMsg: DefendMessage = {
      id: makeId("user", transcript.length),
      role: "user",
      text: trimmed,
    };
    const next = [...transcript, userMsg];
    setTranscript(next);
    setInput("");

    // Если пользователь только что ответил на последний раунд — переходим к grade.
    if (round >= maxRounds) {
      await finalize(next);
      return;
    }

    setRound(round + 1);
    await requestChallenge(next);
  }

  async function finalize(final: DefendMessage[]) {
    setPhase("grading");
    setError(null);
    try {
      const result = await grade(final);
      setPhase("done");
      onComplete({
        outcome: result.outcome,
        summary: result.summary,
        transcript: final,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Вердикт не вынесен");
      setPhase("user-turn");
    }
  }

  const canSend = input.trim().length > 0 && phase === "user-turn";

  return (
    <section
      aria-label="Защити"
      className="w-full max-w-xl mx-auto py-8 sm:py-12 px-4 sm:px-8 flex flex-col min-h-[80vh]"
    >
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.35em] uppercase text-cold-blood text-center mb-3">
        — Защити —
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: maxRounds }).map((_, i) => (
          <span
            key={i}
            className={`h-[2px] w-8 rounded-sm transition-all duration-300 ${
              i + 1 < round
                ? "bg-cold-blood/70"
                : i + 1 === round
                  ? "bg-cold-blood animate-blood-pulse"
                  : "bg-surface-light"
            }`}
          />
        ))}
      </div>

      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.3em] uppercase text-text-muted text-center mb-6">
        Раунд {Math.min(round, maxRounds)} / {maxRounds}
      </div>

      {/* Чат-лента (bottom-up: скролл до низа) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-5 pb-6"
      >
        {transcript.map((m, i) => {
          const isAnchor = i === 0;
          if (m.role === "mentor") {
            return (
              <div
                key={m.id}
                className="max-w-[90%] sm:max-w-[85%] self-start animate-[slide-up_0.4s_ease-out]"
              >
                <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-cold-blood mb-1.5">
                  Наставник
                </div>
                <div className="border-l-2 border-cold-blood pl-4 py-1">
                  <p className="font-verse text-base sm:text-lg leading-relaxed text-text-primary">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div
              key={m.id}
              className="max-w-[90%] sm:max-w-[85%] self-end text-right animate-[slide-up_0.4s_ease-out]"
            >
              {isAnchor && (
                <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-text-muted mb-1.5">
                  Твоя позиция
                </div>
              )}
              <p
                className={`font-verse text-base sm:text-lg leading-relaxed ${
                  isAnchor
                    ? "italic text-text-secondary"
                    : "text-text-primary"
                }`}
              >
                {m.text}
              </p>
            </div>
          );
        })}

        {phase === "mentor-thinking" && (
          <div className="self-start max-w-[85%]">
            <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-cold-blood mb-1.5">
              Наставник
            </div>
            <p className="font-verse italic text-text-secondary animate-pulse pl-4 border-l-2 border-cold-blood/40">
              …наставник формулирует
            </p>
          </div>
        )}

        {phase === "grading" && (
          <div className="self-center text-center pt-4">
            <p className="font-ritual text-xs tracking-[0.35em] uppercase text-cold-blood animate-pulse">
              …выносится вердикт
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="font-sans text-xs text-[#B98787] mb-3 opacity-80">
          {error}
        </p>
      )}

      {phase !== "done" && phase !== "grading" && (
        <div className="border-t border-border pt-4 mt-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={phase !== "user-turn"}
            placeholder="Ответь наставнику…"
            rows={3}
            className="w-full bg-transparent resize-none outline-none font-verse text-base sm:text-lg leading-relaxed text-text-primary placeholder:text-text-muted placeholder:italic border-0 border-b border-border focus:border-cold-blood transition-colors duration-300 pb-2 pt-1 px-0 disabled:opacity-60"
          />
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="font-ritual text-xs tracking-[0.35em] uppercase text-text-primary hover:text-cold-blood transition-colors duration-300 disabled:opacity-30 disabled:cursor-not-allowed py-2"
            >
              Ответить
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default DefendStage;
