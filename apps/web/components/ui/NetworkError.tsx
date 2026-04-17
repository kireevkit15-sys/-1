'use client';

import { useEffect, useState } from 'react';

interface NetworkErrorProps {
  onDismiss?: () => void;
  /**
   * Вызывается при клике на «Повторить». Если не передан — fallback
   * на window.location.reload(). Предпочтительнее передавать callback,
   * чтобы не терять state формы / несохранённый ввод.
   */
  onRetry?: () => void;
}

export default function NetworkError({ onDismiss, onRetry }: NetworkErrorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setVisible(false);
      onDismiss?.();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [onDismiss]);

  if (!visible) return null;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
      <div
        className="glass-card w-full max-w-sm p-8 flex flex-col items-center text-center gap-5
                   border-accent-red/25"
        style={{
          boxShadow:
            '0 8px 32px rgb(0 0 0 / 0.5), 0 0 40px rgb(var(--color-accent-red) / 0.08), inset 0 1px 0 rgb(var(--border-on-dark) / 0.05)',
        }}
      >
        {/* WiFi-off icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center
                     bg-accent-red/10 border border-accent-red/25 text-accent-red"
          style={{
            boxShadow: '0 0 20px rgb(var(--color-accent-red) / 0.15)',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary">
            Нет подключения к интернету
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Проверьте соединение и попробуйте снова
          </p>
        </div>

        <button
          onClick={handleRetry}
          className="mt-1 w-full py-3 px-6 rounded-xl font-semibold text-sm
                     bg-accent-red/15 hover:bg-accent-red/25
                     border border-accent-red/35
                     text-accent-red
                     transition-all duration-200
                     hover:-translate-y-px active:translate-y-0 active:scale-[0.98]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red/60"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}
