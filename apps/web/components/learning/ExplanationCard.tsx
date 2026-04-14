/**
 * F22.3 — ExplanationCard
 * "Раскрытие": длинное полноценное объяснение. Иконка книги, ритуальный
 * заголовок (Cinzel), читабельный параграфный текст. Опциональная
 * ненавязчивая кнопка "Глубже".
 */

interface ExplanationCardProps {
  title: string;
  body: string;
  onDeeper?: () => void;
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
}

export function ExplanationCard({ title, body, onDeeper }: ExplanationCardProps) {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <article
      aria-label={title}
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "60ch" }}>
        <div className="flex flex-col items-start gap-5 mb-8">
          <BookIcon className="text-accent" />
          <h2 className="font-ritual text-2xl sm:text-3xl tracking-[0.08em] text-text-primary leading-tight">
            {title}
          </h2>
        </div>

        <div className="flex flex-col gap-5 text-text-primary/90 text-[15px] sm:text-base leading-[1.7]">
          {paragraphs.length > 0
            ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
            : <p>{body}</p>}
        </div>

        {onDeeper && (
          <div className="mt-12 flex justify-start">
            <button
              type="button"
              onClick={onDeeper}
              className="text-sm text-text-secondary border-b border-border pb-0.5 transition-colors duration-200 hover:text-accent hover:border-accent"
            >
              Глубже
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default ExplanationCard;
