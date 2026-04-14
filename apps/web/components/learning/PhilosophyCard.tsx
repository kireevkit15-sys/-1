/**
 * F23.5 — PhilosophyCard «Философия/История».
 * Глубокий контекст: откуда идея пришла, в какой школе/эпохе родилась.
 * Визуал — лестница времени: эпоха/мыслитель/идея.
 */

interface PhilosophyCardProps {
  era: string; // "Древняя Греция, V век до н.э."
  thinker: string; // "Сократ"
  school?: string; // "досократики" / "стоики"
  idea: string; // основная идея в этом контексте
  legacy: string; // что это даёт сегодня
}

function ColumnIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 21h14" />
      <path d="M5 3h14" />
      <path d="M4 3v0c0 1 .5 2 2 2h12c1.5 0 2-1 2-2" />
      <path d="M4 21v0c0-1 .5-2 2-2h12c1.5 0 2 1 2 2" />
      <path d="M8 5v14" />
      <path d="M12 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

export function PhilosophyCard({ era, thinker, school, idea, legacy }: PhilosophyCardProps) {
  return (
    <article
      aria-label={`Философия: ${thinker}`}
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "60ch" }}>
        <div className="flex flex-col items-start gap-5 mb-8">
          <ColumnIcon className="text-branch-erudition" />
          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
              Философия · История
            </div>
            <h2 className="font-ritual text-2xl sm:text-3xl tracking-[0.1em] text-text-primary leading-tight">
              {thinker}
            </h2>
          </div>
        </div>

        {/* метаданные — эпоха, школа */}
        <div className="flex flex-wrap items-center gap-3 mb-8 text-xs">
          <span className="font-ritual tracking-[0.2em] uppercase text-branch-erudition border border-branch-erudition/30 bg-branch-erudition/5 rounded-full px-3 py-1">
            {era}
          </span>
          {school && (
            <span className="font-ritual tracking-[0.2em] uppercase text-text-secondary border border-border rounded-full px-3 py-1">
              {school}
            </span>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
              Идея
            </div>
            <p className="text-[15px] sm:text-base leading-[1.7] text-text-primary/90">
              {idea}
            </p>
          </div>

          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
              Что это даёт сегодня
            </div>
            <p className="font-verse italic text-base sm:text-lg leading-relaxed text-text-primary">
              {legacy}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PhilosophyCard;
