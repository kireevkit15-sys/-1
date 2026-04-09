"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayKey(prefix: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${prefix}_${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SwipeToDismissProps {
  /** Content to wrap */
  children: ReactNode;
  /** Called when the card is dismissed (after animation ends) */
  onDismiss?: () => void;
  /**
   * localStorage key prefix.
   * Actual key stored is `{storageKey}_YYYY-MM-DD` so it resets each day.
   * Default: "razum_fact_dismissed"
   */
  storageKey?: string;
  /** Minimum horizontal swipe distance in px to trigger dismissal. Default: 100 */
  threshold?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SwipeToDismiss({
  children,
  onDismiss,
  storageKey = "razum_fact_dismissed",
  threshold = 100,
}: SwipeToDismissProps) {
  const key = todayKey(storageKey);

  // Check if already dismissed today
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) === "1";
  });

  const [offsetX, setOffsetX] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [animatingOut, setAnimatingOut] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-check on mount in case component renders SSR-first
  useEffect(() => {
    if (localStorage.getItem(key) === "1") {
      setDismissed(true);
    }
  }, [key]);

  const triggerDismiss = () => {
    setAnimatingOut(true);
    // Animate off-screen
    setOffsetX(400);
    setOpacity(0);
    setTimeout(() => {
      localStorage.setItem(key, "1");
      setDismissed(true);
      onDismiss?.();
    }, 320);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) touchStartX.current = touch.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartX.current;
    if (dx > 0) {
      setOffsetX(dx);
      setOpacity(Math.max(0, 1 - dx / (threshold * 2.5)));
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    if (offsetX >= threshold) {
      triggerDismiss();
    } else {
      // Snap back
      setOffsetX(0);
      setOpacity(1);
    }
    touchStartX.current = null;
  };

  if (dismissed) return null;

  const isTracking = touchStartX.current !== null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity,
        transition: isTracking || animatingOut
          ? animatingOut
            ? "transform 0.32s cubic-bezier(0.4,0,1,1), opacity 0.32s ease"
            : "none"
          : "transform 0.25s ease, opacity 0.25s ease",
        touchAction: "pan-y",
        position: "relative",
      }}
    >
      {/* Drag indicator bar */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/15 pointer-events-none z-10"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
