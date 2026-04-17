'use client';

import { useEffect, useRef, useState } from 'react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'razum_theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [tooltip, setTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialise from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
  }, []);

  const handleToggle = () => {
    if (theme === 'dark') {
      // Light theme not yet implemented — show tooltip and revert
      localStorage.setItem(STORAGE_KEY, 'light');
      setTheme('light');
      setTooltip(true);

      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => {
        setTooltip(false);
        setTheme('dark');
        localStorage.setItem(STORAGE_KEY, 'dark');
      }, 2500);
    } else {
      localStorage.setItem(STORAGE_KEY, 'dark');
      setTheme('dark');
      setTooltip(false);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    }
  };

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleToggle}
        aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
        className={`
          relative w-10 h-10 rounded-xl flex items-center justify-center
          bg-white/[0.04] hover:bg-white/[0.08]
          border border-white/[0.08] hover:border-accent/20
          transition-all duration-200 active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60
          ${isDark ? 'text-accent' : 'text-yellow-400'}
        `}
      >
        {isDark ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>

      {tooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                     whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium
                     pointer-events-none
                     bg-surface/95 border border-accent/25 text-accent
                     shadow-[0_4px_16px_rgb(0_0_0/0.4)]"
          style={{ animation: 'battle-fade-up 0.2s ease forwards' }}
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
