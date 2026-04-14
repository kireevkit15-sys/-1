/**
 * F23.3 — ScienceCard «Наука».
 * Голос РАЗУМ: исследование, цифры, академические акценты.
 * Визуал: заголовок + 3 блока-метрики + текст-контекст.
 */

interface ScienceMetric {
  value: string;
  label: string;
}

interface ScienceCardProps {
  title: string;
  context: string;
  metrics: ScienceMetric[];
  source: string;
}

function ScienceIcon({ className }: { className?: string }) {
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
      <path d="M9 2v7l-5 11c-.5 1 .2 2 1.3 2h13.4c1.1 0 1.8-1 1.3-2L15 9V2" />
      <path d="M8 2h8" />
      <path d="M7.5 14h9" />
    </svg>
  );
}

export function ScienceCard({ title, context, metrics, source }: ScienceCardProps) {
  return (
    <article
      aria-label={`Наука: ${title}`}
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "60ch" }}>
        <div className="flex flex-col items-start gap-5 mb-8">
          <ScienceIcon className="text-branch-logic" />
          <div>
            <div className="font-ritual text-[10px] tracking-[0.35em] uppercase text-branch-logic mb-2">
              Голос РАЗУМ · Наука
            </div>
            <h2 className="font-ritual text-2xl sm:text-3xl tracking-[0.08em] text-text-primary leading-tight">
              {title}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
          {metrics.map((m, i) => (
            <div
              key={i}
              className="border-l-2 border-branch-logic/50 pl-4 py-1"
            >
              <div className="text-2xl sm:text-3xl font-bold text-branch-logic tabular-nums leading-none mb-2">
                {m.value}
              </div>
              <div className="text-xs text-text-secondary leading-snug">
                {m.label}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[15px] sm:text-base leading-[1.7] text-text-primary/90 mb-6">
          {context}
        </p>

        <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted border-t border-border pt-4">
          Источник · {source}
        </div>
      </div>
    </article>
  );
}

export default ScienceCard;
