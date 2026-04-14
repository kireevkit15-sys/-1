/**
 * F22.5 — ExampleCard
 * «Пример»: история из жизни. Визуально отличается от EvidenceCard:
 * фон чуть светлее, текст истории — Cormorant italic (литературный тон).
 */

interface ExampleCardProps {
  /** Заголовок примера — короткая ёмкая формулировка. */
  title: string;
  /** Текст истории — 2–6 предложений. */
  story: string;
}

export function ExampleCard({ title, story }: ExampleCardProps) {
  return (
    <article className="bg-surface-light border border-border rounded-lg p-5 sm:p-6">
      {/* Иконка «история» — открытая книга с закладкой, 24px stroke */}
      <div className="mb-3 text-accent">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {/* левая страница */}
          <path d="M3 5a1 1 0 0 1 1-1h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3V5z" />
          {/* правая страница */}
          <path d="M21 5a1 1 0 0 0-1-1h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7V5z" />
          {/* закладка на правой странице */}
          <path d="M17 4v6l-1.5-1.2L14 10V4" />
        </svg>
      </div>

      {/* Заголовок — ритуальный шрифт */}
      <h3 className="font-ritual text-lg sm:text-xl tracking-wide text-text-primary mb-3">
        {title}
      </h3>

      {/* История — Cormorant italic, литературный тон */}
      <p className="font-verse italic text-base sm:text-lg leading-relaxed text-text-primary/90">
        {story}
      </p>
    </article>
  );
}

export default ExampleCard;
