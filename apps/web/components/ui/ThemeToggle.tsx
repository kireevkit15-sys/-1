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
      // Light theme not yet implemented — store preference but show notice
      localStorage.setItem(STORAGE_KEY, 'light');
      setTheme('light');
      setTooltip(true);

      // Auto-hide tooltip after 2.5 s
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => {
        setTooltip(false);
        // Revert visually (theme stays in localStorage for future use)
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
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: isDark ? 'rgb(207, 157, 123)' : 'rgb(234, 179, 8)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.borderColor = 'rgba(207,157,123,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.92)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isDark ? (
          // Moon icon (currently dark → click to "go light")
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
          // Sun icon (currently "light" — click to go back dark)
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

      {/* Tooltip: "Светлая тема скоро" */}
      {tooltip && (
        <div
          className="absolute bottom-full left-1/2 mb-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium pointer-events-none"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid rgba(207, 157, 123, 0.25)',
            color: 'rgb(207, 157, 123)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            animation: 'battle-fade-up 0.2s ease forwards',
          }}
        >
          Светлая тема скоро
          {/* Caret */}
          <span
            className="absolute left-1/2 top-full"
            style={{
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(207, 157, 123, 0.25)',
            }}
          />
        </div>
      )}
    </div>
  );
}
