/**
 * F23.2 — AlternativeCard «Другой угол».
 * Тот же концепт — через другого автора, другую метафору, другой ракурс.
 * Визуал: две колонки-цитаты (исходный взгляд / альтернативный), между ними символ «/».
 */

interface AlternativeCardProps {
  originalAuthor: string;
  originalView: string;
  alternativeAuthor: string;
  alternativeView: string;
}

function PrismIcon({ className }: { className?: string }) {
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
      <path d="M12 2 L22 20 L2 20 Z" />
      <path d="M12 2 L12 20" opacity="0.5" />
    </svg>
  );
}

export function AlternativeCard({
  originalAuthor,
  originalView,
  alternativeAuthor,
  alternativeView,
}: AlternativeCardProps) {
  return (
    <article
      aria-label="Другой угол"
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "60ch" }}>
        <div className="flex flex-col items-start gap-5 mb-10">
          <PrismIcon className="text-branch-erudition" />
          <h2 className="font-ritual text-2xl sm:text-3xl tracking-[0.08em] text-text-primary leading-tight">
            Другой угол
          </h2>
        </div>

        <div className="grid gap-8 sm:gap-10">
          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
              {originalAuthor}
            </div>
            <p className="font-verse italic text-lg sm:text-xl leading-relaxed text-text-primary/90">
              «{originalView}»
            </p>
          </div>

          <div className="flex items-center gap-4" aria-hidden>
            <span className="flex-1 h-px bg-border" />
            <span className="font-ritual text-[10px] tracking-[0.4em] uppercase text-branch-erudition">
              иначе
            </span>
            <span className="flex-1 h-px bg-border" />
          </div>

          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-branch-erudition mb-2">
              {alternativeAuthor}
            </div>
            <p className="font-verse italic text-lg sm:text-xl leading-relaxed text-text-primary">
              «{alternativeView}»
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default AlternativeCard;
