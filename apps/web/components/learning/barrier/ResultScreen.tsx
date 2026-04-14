"use client";

/**
 * F24.6 + F24.7 — Экран результата барьер-испытания.
 * Две ветви: passed (торжественно, с shimmer) и failed (тишина, бреши).
 */

export type BarrierOutcome = "passed" | "failed";

export interface WeakTopic {
  id: string;
  title: string;
  /** Что делать: "повторить", "переосмыслить" и т.п. */
  hint?: string;
}

export interface ResultScreenProps {
  outcome: BarrierOutcome;
  /** Название только что пройденного/проваленного уровня (для passed) или текущего (для failed). */
  levelName: string;
  /** Ссылка на следующий шаг — продолжить путь (passed) или вернуться к повторению (failed). */
  primaryAction: { label: string; onClick: () => void };
  /** Опционально — открыть карточку "В бой" после прохождения. */
  secondaryAction?: { label: string; onClick: () => void };
  /** Для failed — список слабых тем для повторения. Игнорируется при passed. */
  weakTopics?: WeakTopic[];
}

export default function ResultScreen(props: ResultScreenProps) {
  if (props.outcome === "passed") {
    return <PassedView {...props} />;
  }
  return <FailedView {...props} />;
}

// ── PASSED ──────────────────────────────────────────────────────────
function PassedView({
  levelName,
  primaryAction,
  secondaryAction,
}: ResultScreenProps) {
  return (
    <div className="max-w-xl mx-auto text-center py-20 sm:py-28 px-6 animate-[slide-up_0.6s_ease-out]">
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-steel mb-10">
        — Испытание пройдено —
      </div>

      <p className="font-verse text-lg sm:text-xl text-text-primary mb-5">
        Уровень —
      </p>

      <h1
        className="inline-block font-ritual text-[32px] sm:text-[48px] font-bold tracking-[0.2em] pl-[0.2em] uppercase mb-8 animate-shimmer-flicker"
        style={{
          backgroundImage:
            "linear-gradient(110deg, #8B2E2E 0%, #C0392B 25%, #E8DDD3 50%, #C0392B 75%, #8B2E2E 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {levelName}
      </h1>

      <p className="font-verse italic text-base sm:text-lg text-text-secondary leading-relaxed mb-2">
        Ты поднялся.
      </p>
      <p className="font-verse italic text-base sm:text-lg text-text-secondary leading-relaxed mb-14">
        Путь продолжается.
      </p>

      <button
        onClick={primaryAction.onClick}
        className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-steel rounded-xl px-12 py-4 shadow-neon-steel hover:bg-cold-steel hover:text-background hover:tracking-[0.55em] hover:shadow-[0_0_30px_rgba(107,125,140,0.8),0_0_80px_rgba(107,125,140,0.25)] transition-all duration-300"
      >
        {primaryAction.label}
      </button>

      {secondaryAction && (
        <div className="mt-8">
          <button
            onClick={secondaryAction.onClick}
            className="font-ritual text-[11px] sm:text-xs tracking-[0.35em] uppercase text-cold-blood hover:text-text-primary transition-colors duration-300"
          >
            {secondaryAction.label}
          </button>
        </div>
      )}
    </div>
  );
}

// ── FAILED ──────────────────────────────────────────────────────────
function FailedView({
  levelName,
  primaryAction,
  weakTopics,
}: ResultScreenProps) {
  return (
    <div className="max-w-xl mx-auto text-center py-20 sm:py-28 px-6 animate-[slide-up_0.5s_ease-out]">
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-cold-blood mb-10">
        — Испытание не пройдено —
      </div>

      <h1 className="font-ritual text-xl sm:text-2xl tracking-[0.18em] uppercase text-text-primary mb-8">
        {levelName}
      </h1>

      <p className="font-verse italic text-base sm:text-lg text-text-secondary leading-relaxed mb-12">
        Есть бреши.
        <br />
        Закрой их, потом возвращайся.
      </p>

      {weakTopics && weakTopics.length > 0 && (
        <ul className="flex flex-col gap-3 text-left mb-14">
          {weakTopics.map((topic) => (
            <li
              key={topic.id}
              className="flex items-start gap-4 pl-4 sm:pl-5 py-2 border-l-2 border-cold-blood/70"
            >
              <div className="flex-1 min-w-0">
                <div className="font-verse text-base sm:text-lg text-text-primary leading-snug">
                  {topic.title}
                </div>
                {topic.hint && (
                  <div className="mt-1 font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted">
                    {topic.hint}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={primaryAction.onClick}
        className="font-ritual text-xs sm:text-sm tracking-[0.4em] uppercase text-text-primary border border-cold-blood rounded-xl px-10 py-4 shadow-neon-blood hover:bg-cold-blood hover:text-background hover:tracking-[0.55em] transition-all duration-300"
      >
        {primaryAction.label}
      </button>
    </div>
  );
}
