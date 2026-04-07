"use client";

import Button from "@/components/ui/Button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl opacity-15 bg-accent-gold rounded-full scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-surface border border-accent-gold/20 flex items-center justify-center shadow-[0_0_40px_rgba(185,141,52,0.1)]">
          <svg className="w-12 h-12 text-accent-gold" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M8 24c0-9 7-16 16-16s16 7 16 16" strokeLinecap="round" />
            <path d="M14 24c0-5.5 4.5-10 10-10s10 4.5 10 10" strokeLinecap="round" />
            <path d="M20 24c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round" />
            <circle cx="24" cy="28" r="2" fill="currentColor" />
            {/* Diagonal "no" line */}
            <path d="M10 38L38 10" strokeWidth="3" strokeLinecap="round" className="text-accent-red" stroke="currentColor" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold text-text-primary mb-2">
        Нет соединения
      </h1>
      <p className="text-text-secondary text-sm mb-8 max-w-xs">
        Проверь подключение к интернету и попробуй снова. Некоторые функции доступны офлайн.
      </p>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-xs">
        <Button fullWidth onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      </div>
    </div>
  );
}
