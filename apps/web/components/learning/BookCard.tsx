/**
 * F23.4 — BookCard «Книга».
 * Ключевая идея из книги, связанная с темой. Визуал — как страница книги:
 * название книги с автором и годом, курсивная цитата, ключевая мысль.
 */

interface BookCardProps {
  bookTitle: string;
  author: string;
  year?: string | number;
  keyIdea: string; // ключевая мысль (поясняющая проза)
  quote?: string; // опциональная цитата из книги
}

function BookmarkIcon({ className }: { className?: string }) {
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
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function BookCard({ bookTitle, author, year, keyIdea, quote }: BookCardProps) {
  return (
    <article
      aria-label={`Книга: ${bookTitle}`}
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "60ch" }}>
        <div className="flex flex-col items-start gap-5 mb-8">
          <BookmarkIcon className="text-accent-gold" />
          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
              Книга
            </div>
            <h2 className="font-verse text-2xl sm:text-3xl text-text-primary leading-tight mb-2">
              {bookTitle}
            </h2>
            <div className="text-sm text-text-secondary">
              {author}
              {year ? <span className="text-text-muted"> · {year}</span> : null}
            </div>
          </div>
        </div>

        {quote && (
          <blockquote className="relative my-8 pl-6 border-l-2 border-accent-gold/60">
            <p className="font-verse italic text-lg sm:text-xl leading-relaxed text-text-primary">
              {quote}
            </p>
          </blockquote>
        )}

        <p className="text-[15px] sm:text-base leading-[1.7] text-text-primary/90">
          {keyIdea}
        </p>
      </div>
    </article>
  );
}

export default BookCard;
