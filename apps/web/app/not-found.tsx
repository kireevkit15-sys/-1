"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl opacity-15 bg-accent rounded-full scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-surface border border-accent/20 flex items-center justify-center shadow-[0_0_40px_rgba(207,157,123,0.1)]">
          <svg className="w-12 h-12 text-accent" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="24" cy="24" r="20" />
            <path d="M16 18h.01M32 18h.01" strokeLinecap="round" strokeWidth="3" />
            <path d="M18 32c2-3 6-4 6-4s4 1 6 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h1 className="text-5xl font-bold text-accent mb-3">404</h1>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Страница не найдена
      </h2>
      <p className="text-text-secondary text-sm mb-8 max-w-xs">
        Эта страница затерялась в лабиринте знаний. Вернись на главную и продолжи путь.
      </p>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-xs">
        <Link href="/">
          <Button fullWidth>На главную</Button>
        </Link>
        <Link href="/battle/new" className="block">
          <Button variant="secondary" fullWidth>
            К баттлам
          </Button>
        </Link>
      </div>
    </div>
  );
}
