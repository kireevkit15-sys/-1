'use client';

import { useEffect, useState } from 'react';

interface NetworkErrorProps {
  onDismiss?: () => void;
}

export default function NetworkError({ onDismiss }: NetworkErrorProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
      <div
        className="glass-card w-full max-w-sm p-8 flex flex-col items-center text-center gap-5"
        style={{
          borderColor: 'rgba(220, 38, 38, 0.25)',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(220,38,38,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* WiFi-off icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.15)',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgb(248, 113, 113)"
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
            <circle cx="12" cy="20" r="1" fill="rgb(248, 113, 113)" stroke="none" />
          </svg>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-primary">
            Нет подключения к интернету
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Проверьте соединение и попробуйте снова
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-1 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200"
          style={{
            background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: 'rgb(248, 113, 113)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.25)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
        >
          Повторить
        </button>
      </div>
    </div>
  );
}
