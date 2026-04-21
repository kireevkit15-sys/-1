"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() => {});
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-3xl opacity-15 bg-accent-red rounded-full scale-150" />
        <div className="relative w-24 h-24 rounded-full bg-surface border border-accent-red/20 flex items-center justify-center shadow-[0_0_40px_rgba(137,53,42,0.1)]">
          <svg className="w-12 h-12 text-accent-red" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M24 4L44 40H4L24 4z" strokeLinejoin="round" />
            <path d="M24 18v10" strokeLinecap="round" />
            <circle cx="24" cy="33" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold text-text-primary mb-2">
        Что-то пошло не так
      </h1>
      <p className="text-text-secondary text-sm mb-8 max-w-xs">
        Произошла непредвиденная ошибка. Попробуй перезагрузить страницу или вернуться на главную.
      </p>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-xs">
        <Button fullWidth onClick={reset}>
          Попробовать снова
        </Button>
        <a href="/" className="block">
          <Button variant="secondary" fullWidth>
            На главную
          </Button>
        </a>
      </div>

      {/* Error digest for debugging */}
      {error.digest && (
        <p className="mt-6 text-text-muted text-xs font-mono">
          {error.digest}
        </p>
      )}
    </div>
  );
}
