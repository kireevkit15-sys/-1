/**
 * F22.4 — EvidenceCard
 * «Подкрепление»: научный факт. Статистика крупно, источник мелко, описание ниже.
 * Слева вертикальная акцентная полоска (3px) цвета ветки знаний (дефолт — медный #CF9D7B).
 */

interface EvidenceCardProps {
  /** Цвет вертикальной акцентной полоски (CSS-цвет). Дефолт — медный акцент. */
  branchColor?: string;
  /** Крупная цифра или короткая статистика (например, "87%" или "в 3 раза"). */
  statistic: string;
  /** Источник: журнал, исследование, автор. */
  source: string;
  /** Пояснение факта в 1–3 предложения. */
  description: string;
  /** Если задан — показать кнопку «Глубже» внизу карточки. */
  onDeeper?: () => void;
}

const DEFAULT_BRANCH_COLOR = "#CF9D7B";

export function EvidenceCard({
  branchColor = DEFAULT_BRANCH_COLOR,
  statistic,
  source,
  description,
  onDeeper,
}: EvidenceCardProps) {
  return (
    <article
      className="relative bg-surface border border-border rounded-lg py-5 pr-5 pl-7 sm:py-6 sm:pr-6 sm:pl-8"
    >
      {/* Вертикальная акцентная полоска слева — 3px, цвет ветки */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 rounded-sm"
        style={{ width: "3px", backgroundColor: branchColor }}
      />

      {/* Иконка «наука» — колба, минималистично stroke, 24px */}
      <div className="mb-3" style={{ color: branchColor }}>
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
          <path d="M9 3h6" />
          <path d="M10 3v6.5L5.5 17.5A2.5 2.5 0 0 0 7.65 21h8.7a2.5 2.5 0 0 0 2.15-3.5L14 9.5V3" />
          <path d="M7.5 14h9" />
        </svg>
      </div>

      {/* Крупная статистика */}
      <div
        className="font-ritual text-3xl sm:text-4xl leading-none mb-2 tracking-wide"
        style={{ color: branchColor }}
      >
        {statistic}
      </div>

      {/* Источник — мелко, приглушённо */}
      <div className="text-xs uppercase tracking-[0.2em] text-text-secondary opacity-60 mb-4">
        {source}
      </div>

      {/* Описание */}
      <p className="font-verse text-base sm:text-lg leading-relaxed text-text-primary">
        {description}
      </p>

      {onDeeper && (
        <div className="mt-5 sm:mt-6 flex justify-start">
          <button
            type="button"
            onClick={onDeeper}
            className="font-ritual text-xs tracking-[0.3em] uppercase text-text-secondary border-b border-border pb-0.5 transition-colors duration-200 hover:text-accent hover:border-accent"
          >
            Глубже
          </button>
        </div>
      )}
    </article>
  );
}

export default EvidenceCard;
