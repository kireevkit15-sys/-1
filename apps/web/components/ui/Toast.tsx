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

// ── Icons (inline SVG — no external deps) ────────────────────────────────────

function ToastIcon({ type }: { type: ToastType }) {
  const base = "w-5 h-5 flex-shrink-0";

  switch (type) {
    case "xp":
      // Gold coin / star
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.83L10 13.27l-4.33 2.24.83-4.83L3 7.27l4.91-.71L10 2z"
            fill="#CF9D7B"
            stroke="#B98D34"
            strokeWidth="0.5"
          />
        </svg>
      );
    case "achievement":
      // Trophy / badge
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 13c-3.31 0-6-2.69-6-6V3h12v4c0 3.31-2.69 6-6 6z"
            fill="#A855F7"
            fillOpacity="0.3"
            stroke="#A855F7"
            strokeWidth="1.2"
          />
          <path d="M7 16h6M10 13v3" stroke="#A855F7" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M4 5H2v2a2 2 0 002 2M16 5h2v2a2 2 0 01-2 2" stroke="#A855F7" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "streak":
      // Flame
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 18c-3.31 0-6-2.24-6-5 0-2.1 1.5-3.8 3-5 0 1 .5 2 1.5 2.5C8 8 8.5 5 10 3c.5 2 2 3.5 2 5 .5-.5.8-1.5.8-2.5 1.5 1.2 3.2 3 3.2 5 0 2.76-2.69 5-6 5z"
            fill="#E67E22"
            fillOpacity="0.3"
            stroke="#E67E22"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="14" r="1.5" fill="#E67E22" />
        </svg>
      );
    case "error":
      // X circle
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="7" fill="#C0392B" fillOpacity="0.2" stroke="#C0392B" strokeWidth="1.2" />
          <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "info":
    default:
      // Info circle
      return (
        <svg className={base} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="7" fill="#E8DDD3" fillOpacity="0.1" stroke="#87756A" strokeWidth="1.2" />
          <path d="M10 9v5" stroke="#87756A" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="10" cy="7" r="0.8" fill="#87756A" />
        </svg>
      );
  }
}

// ── Accent colours per type ───────────────────────────────────────────────────

const BORDER_COLORS: Record<ToastType, string> = {
  xp:          "rgba(185,141,52,0.4)",
  achievement: "rgba(168,85,247,0.4)",
  streak:      "rgba(230,126,34,0.4)",
  info:        "rgba(135,117,106,0.3)",
  error:       "rgba(192,57,43,0.4)",
};

const GLOW_COLORS: Record<ToastType, string> = {
  xp:          "rgba(185,141,52,0.15)",
  achievement: "rgba(168,85,247,0.15)",
  streak:      "rgba(230,126,34,0.15)",
  info:        "rgba(0,0,0,0)",
  error:       "rgba(192,57,43,0.15)",
};

// ── Single Toast item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide-in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss after 3 s
  useEffect(() => {
    timerRef.current = setTimeout(() => handleDismiss(), 3000);
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

  const borderColor = BORDER_COLORS[toast.type];
  const glowColor  = GLOW_COLORS[toast.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        transform:  visible ? "translateY(0) scale(1)"    : "translateY(24px) scale(0.95)",
        opacity:    visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
        background: "rgba(17,17,20,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${borderColor}`,
        borderRadius: "14px",
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
        minWidth: "260px",
        maxWidth: "360px",
        width: "100%",
        pointerEvents: "auto",
      }}
    >
      <ToastIcon type={toast.type} />

      <span
        style={{
          flex: 1,
          fontSize: "14px",
          lineHeight: "1.4",
          color: "#E8DDD3",
          fontWeight: 450,
        }}
      >
        {toast.message}
      </span>

      <button
        onClick={handleDismiss}
        aria-label="Закрыть"
        style={{
          flexShrink: 0,
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#56453A",
          borderRadius: "4px",
          transition: "color 0.15s",
          padding: 0,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#87756A")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#56453A")}
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
      // Keep only the last MAX_TOASTS entries
      return next.slice(-MAX_TOASTS);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Portal-like fixed container at bottom-center */}
      <div
        aria-label="Уведомления"
        style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "center",
          pointerEvents: "none",
          width: "min(calc(100vw - 32px), 380px)",
        }}
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
