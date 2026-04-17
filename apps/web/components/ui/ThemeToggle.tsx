'use client';

import { useState } from 'react';

const TOOLTIP_ID = 'theme-toggle-tooltip';

/**
 * Светлая тема пока не реализована. До появления второй темы
 * кнопка остаётся видимой, но не активной — по hover/focus показывает
 * tooltip «Скоро». Фейковое переключение (как было раньше) нарушало
 * доверие: пользователь видел, как его выбор молча откатывается.
 *
 * Важно: используем aria-disabled + preventDefault вместо disabled,
 * потому что WebKit/Safari пропускает disabled-элементы при Tab-навигации,
 * и пользователь клавиатуры не увидел бы tooltip.
 */
export default function ThemeToggle() {
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const tooltipVisible = hover || focused;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-disabled="true"
        aria-label="Светлая тема скоро будет доступна"
        aria-describedby={tooltipVisible ? TOOLTIP_ID : undefined}
        onClick={(e) => e.preventDefault()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center
                   bg-white/[0.04] border border-white/[0.08]
                   text-accent/50 cursor-not-allowed
                   transition-colors duration-200
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      {tooltipVisible && (
        <div
          id={TOOLTIP_ID}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                     whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium
                     pointer-events-none
                     bg-surface/95 border border-accent/25 text-accent
                     shadow-[0_4px_16px_rgb(0_0_0/0.4)]"
          style={{ animation: 'battle-fade-up 0.15s ease forwards' }}
        >
          Светлая тема скоро
          <span
            className="absolute left-1/2 top-full -translate-x-1/2
                       w-0 h-0 border-x-[5px] border-x-transparent
                       border-t-[5px] border-t-accent/25"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
