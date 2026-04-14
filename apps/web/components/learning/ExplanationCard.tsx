/**
 * F22.3 — ExplanationCard «Раскрытие».
 * Философский монолит: тёплый свет сверху, медный корешок слева,
 * типографический ритм, тяжёлый шаг к «Глубже».
 */

interface ExplanationCardProps {
  title: string;
  body: string;
  onDeeper?: () => void;
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
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

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </svg>
  );
}

export function ExplanationCard({ title, body, onDeeper }: ExplanationCardProps) {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <article
      aria-label={title}
      className="relative w-full px-6 sm:px-10 py-10 sm:py-14 overflow-hidden"
    >
      {/* Тёплое свечение над заголовком — основа атмосферы */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[620px] h-[360px]"
        style={{
          background:
            "radial-gradient(ellipse at center top, rgba(207,157,123,0.22) 0%, rgba(185,141,52,0.08) 30%, transparent 65%)",
          filter: "blur(6px)",
        }}
      />

      {/* Левый «корешок» — медный градиент */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-6 sm:left-10 top-10 sm:top-14 bottom-10 sm:bottom-14 w-[2px] rounded-full"
        style={{
          background:
            "linear-gradient(to bottom, rgba(207,157,123,0.85) 0%, rgba(207,157,123,0.35) 35%, rgba(207,157,123,0.08) 75%, transparent 100%)",
          boxShadow: "0 0 10px rgba(207,157,123,0.25)",
        }}
      />

      <div className="relative mx-auto" style={{ maxWidth: "60ch" }}>
        {/* Метка «Раскрытие» с иконкой */}
        <div className="flex items-center gap-4 mb-6 pl-4 sm:pl-6">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 blur-lg bg-accent/40 rounded-full scale-125"
            />
            <BookIcon className="text-accent relative z-10" />
          </div>
          <span className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-accent/80">
            Раскрытие
          </span>
        </div>

        {/* Заголовок */}
        <h2 className="font-ritual text-3xl sm:text-[40px] leading-[1.15] tracking-[0.06em] text-text-primary mb-4 pl-4 sm:pl-6">
          {title}
        </h2>

        {/* Медный луч под заголовком */}
        <div
          aria-hidden
          className="h-[2px] w-20 mb-8 ml-4 sm:ml-6"
          style={{
            background:
              "linear-gradient(to right, rgba(207,157,123,1) 0%, rgba(207,157,123,0.4) 60%, transparent 100%)",
          }}
        />

        {/* Абзацы */}
        <div className="flex flex-col gap-5 pl-4 sm:pl-6">
          {(paragraphs.length > 0 ? paragraphs : [body]).map((p, i) => (
            <p
              key={i}
              className="font-verse text-[17px] sm:text-[19px] leading-[1.75] text-text-primary/95"
            >
              {p}
            </p>
          ))}
        </div>

        {onDeeper && (
          <div className="mt-14 pl-4 sm:pl-6">
            {/* Градиентный разделитель меди */}
            <div
              aria-hidden
              className="h-px w-full mb-8"
              style={{
                background:
                  "linear-gradient(to right, rgba(207,157,123,0.55) 0%, rgba(207,157,123,0.15) 50%, transparent 100%)",
              }}
            />

            <div className="font-verse italic text-[15px] sm:text-base text-text-secondary leading-relaxed mb-6 max-w-[48ch]">
              Эта мысль имеет дно. Под ней — другой автор, научный слой, книга,
              философский корень, возражение и паутина связей.
            </div>

            <button
              type="button"
              onClick={onDeeper}
              className="group relative inline-flex items-center gap-4 font-ritual text-[11px] sm:text-xs tracking-[0.4em] uppercase text-text-primary border border-accent/50 rounded-lg px-7 sm:px-9 py-4 bg-gradient-to-br from-surface/80 to-surface-light/40 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-accent hover:tracking-[0.5em] hover:shadow-[0_0_40px_rgba(207,157,123,0.3),inset_0_0_20px_rgba(207,157,123,0.05)] hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 40%, rgba(207,157,123,0.12) 50%, transparent 60%)",
                }}
              />
              <span className="relative">Спуститься глубже</span>
              <ChevronDown className="relative w-4 h-4 text-accent transition-transform duration-500 group-hover:translate-y-1" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default ExplanationCard;
