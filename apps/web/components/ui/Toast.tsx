"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = "xp" | "achievement" | "streak" | "info" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Icons (inline SVG — no external deps, colours read from currentColor) ─────

function ToastIcon({ type }: { type: ToastType }) {
  const base = "w-5 h-5 flex-shrink-0";

  switch (type) {
    case "xp":
      // Gold coin / star
      return (
        <svg className={`${base} text-accent`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.83L10 13.27l-4.33 2.24.83-4.83L3 7.27l4.91-.71L10 2z"
            fill="currentColor"
            className="text-accent-gold"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>
      );
    case "achievement":
      return (
        <svg className={`${base} text-achievement`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 13c-3.31 0-6-2.69-6-6V3h12v4c0 3.31-2.69 6-6 6z"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path d="M7 16h6M10 13v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M4 5H2v2a2 2 0 002 2M16 5h2v2a2 2 0 01-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "streak":
      return (
        <svg className={`${base} text-accent-orange`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 18c-3.31 0-6-2.24-6-5 0-2.1 1.5-3.8 3-5 0 1 .5 2 1.5 2.5C8 8 8.5 5 10 3c.5 2 2 3.5 2 5 .5-.5.8-1.5.8-2.5 1.5 1.2 3.2 3 3.2 5 0 2.76-2.69 5-6 5z"
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="14" r="1.5" fill="currentColor" />
        </svg>
      );
    case "error":
      return (
        <svg className={`${base} text-accent-red`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "info":
    default:
      return (
        <svg className={`${base} text-text-secondary`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M10 9v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="7" r="0.8" fill="currentColor" />
        </svg>
      );
  }
}

// ── Accent border / glow per type — читаются через Tailwind alpha ─────────────

const TYPE_STYLES: Record<ToastType, { border: string; glow: string }> = {
  xp:          { border: "border-accent-gold/40",   glow: "0 0 20px rgb(var(--color-accent-gold) / 0.15)" },
  achievement: { border: "border-achievement/40",   glow: "0 0 20px rgb(var(--color-achievement) / 0.15)" },
  streak:      { border: "border-accent-orange/40", glow: "0 0 20px rgb(var(--color-accent-orange) / 0.15)" },
  info:        { border: "border-text-secondary/30", glow: "0 0 0 transparent" },
  error:       { border: "border-accent-red/40",    glow: "0 0 20px rgb(var(--color-accent-red) / 0.15)" },
};

// ── Single Toast item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 3000;

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide-in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(() => handleDismiss(), AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    setVisible(false);
    // Wait for slide-out animation before removing from DOM
    setTimeout(() => onDismiss(toast.id), 300);
  }

  const { border, glow } = TYPE_STYLES[toast.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        flex items-center gap-2.5 px-3.5 py-3 w-full min-w-[260px] max-w-[360px]
        rounded-2xl bg-surface/85 backdrop-blur-xl border ${border}
        pointer-events-auto
      `}
      style={{
        transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
        boxShadow: `0 8px 32px rgb(0 0 0 / 0.5), ${glow}, inset 0 1px 0 rgb(var(--border-on-dark) / 0.05)`,
      }}
    >
      <ToastIcon type={toast.type} />

      <span className="flex-1 text-sm leading-snug text-text-primary font-normal">
        {toast.message}
      </span>

      <button
        onClick={handleDismiss}
        aria-label="Закрыть"
        className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center
                   text-text-muted hover:text-text-secondary rounded
                   transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-MAX_TOASTS);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        aria-label="Уведомления"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
                   flex flex-col gap-2 items-center pointer-events-none
                   w-[min(calc(100vw-32px),380px)]"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
