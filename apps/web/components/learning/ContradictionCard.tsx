/**
 * F23.6 — ContradictionCard «Противоречие».
 * Два противоположных взгляда на одну тему — и вопрос «кто прав?».
 * Визуал: две колонки на десктопе (стопкой на мобайл), разные цвета акцента.
 */

interface ViewPoint {
  label: string; // "Макиавелли", "Кант", "Рациональный взгляд"
  thesis: string; // главный тезис
  argument: string; // краткое обоснование
}

interface ContradictionCardProps {
  question: string; // "Цель оправдывает средства?"
  viewA: ViewPoint;
  viewB: ViewPoint;
}

function ScalesIcon({ className }: { className?: string }) {
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
      <path d="M12 3v18" />
      <path d="M5 6h14" />
      <path d="M8 6l-3 7a3 3 0 0 0 6 0L8 6Z" />
      <path d="M16 6l-3 7a3 3 0 0 0 6 0L16 6Z" />
      <path d="M7 21h10" />
    </svg>
  );
}

export function ContradictionCard({ question, viewA, viewB }: ContradictionCardProps) {
  return (
    <article
      aria-label={`Противоречие: ${question}`}
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "72ch" }}>
        <div className="flex flex-col items-start gap-5 mb-8">
          <ScalesIcon className="text-accent-red" />
          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-accent-red mb-2">
              Противоречие
            </div>
            <h2 className="font-verse text-2xl sm:text-3xl text-text-primary leading-tight">
              {question}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-0 items-stretch">
          {/* Взгляд A */}
          <div className="md:pr-6 border-b md:border-b-0 md:border-r border-border pb-5 md:pb-0">
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-branch-strategy mb-3">
              {viewA.label}
            </div>
            <h3 className="font-verse text-xl sm:text-2xl text-text-primary leading-snug mb-3">
              {viewA.thesis}
            </h3>
            <p className="text-sm sm:text-[15px] leading-[1.65] text-text-secondary">
              {viewA.argument}
            </p>
          </div>

          {/* Разделитель — на десктопе буква «vs» */}
          <div
            aria-hidden
            className="hidden md:flex items-center justify-center px-4"
          >
            <span className="font-ritual text-[10px] tracking-[0.4em] uppercase text-text-muted rotate-90 whitespace-nowrap">
              против
            </span>
          </div>

          {/* Взгляд B */}
          <div className="md:pl-6 pt-5 md:pt-0">
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-branch-logic mb-3">
              {viewB.label}
            </div>
            <h3 className="font-verse text-xl sm:text-2xl text-text-primary leading-snug mb-3">
              {viewB.thesis}
            </h3>
            <p className="text-sm sm:text-[15px] leading-[1.65] text-text-secondary">
              {viewB.argument}
            </p>
          </div>
        </div>

        <div className="mt-10 text-center font-ritual text-[10px] tracking-[0.4em] uppercase text-text-muted">
          — Кто прав? Решать тебе —
        </div>
      </div>
    </article>
  );
}

export default ContradictionCard;
