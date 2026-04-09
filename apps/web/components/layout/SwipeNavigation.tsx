"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";

// ---------------------------------------------------------------------------
// Tab order for swipe navigation
// ---------------------------------------------------------------------------

const TAB_ORDER = ["/", "/battle/new", "/learn", "/leaderboard", "/profile"] as const;

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const MIN_SWIPE_X = 80;  // minimum horizontal distance to trigger navigation
const MAX_SWIPE_Y = 50;  // maximum vertical delta to avoid stealing scroll

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SwipeState {
  startX: number;
  startY: number;
  /** 'left' = user swiped left → go to next tab, 'right' = previous tab */
  direction: "left" | "right" | null;
  active: boolean;
}

interface SwipeNavigationProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SwipeNavigation({ children }: SwipeNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const swipeRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    direction: null,
    active: false,
  });

  // Visual feedback state: 'left' | 'right' | null
  const [edgeShadow, setEdgeShadow] = useState<"left" | "right" | null>(null);

  // ---------------------------------------------------------------------------
  // Current tab index
  // ---------------------------------------------------------------------------

  const currentIndex = TAB_ORDER.findIndex((p) => p === pathname);

  // ---------------------------------------------------------------------------
  // Touch handlers
  // ---------------------------------------------------------------------------

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    if (!touch) return;
    swipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      direction: null,
      active: true,
    };
    setEdgeShadow(null);
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!swipeRef.current.active) return;

    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - swipeRef.current.startX;
    const deltaY = Math.abs(touch.clientY - swipeRef.current.startY);

    // If vertical movement dominates, cancel swipe to not steal scroll
    if (deltaY > MAX_SWIPE_Y) {
      swipeRef.current.active = false;
      setEdgeShadow(null);
      return;
    }

    // Show subtle edge shadow as visual feedback
    if (Math.abs(deltaX) > 20) {
      const dir = deltaX < 0 ? "left" : "right";
      swipeRef.current.direction = dir;
      setEdgeShadow(dir);
    }
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (!swipeRef.current.active) return;
    swipeRef.current.active = false;
    setEdgeShadow(null);

    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - swipeRef.current.startX;
    const deltaY = Math.abs(touch.clientY - swipeRef.current.startY);

    // Ignore if mostly vertical
    if (deltaY > MAX_SWIPE_Y) return;

    // Ignore if too short
    if (Math.abs(deltaX) < MIN_SWIPE_X) return;

    // currentIndex === -1 means we're on an unknown page, skip navigation
    if (currentIndex === -1) return;

    if (deltaX < 0) {
      // Swipe left → next tab
      const next = TAB_ORDER[currentIndex + 1];
      if (next) router.push(next);
    } else {
      // Swipe right → previous tab
      const prev = TAB_ORDER[currentIndex - 1];
      if (prev) router.push(prev);
    }
  }

  function handleTouchCancel() {
    swipeRef.current.active = false;
    setEdgeShadow(null);
  }

  // ---------------------------------------------------------------------------
  // Edge shadow styles
  // ---------------------------------------------------------------------------

  const edgeStyle: React.CSSProperties =
    edgeShadow === "left"
      ? {
          boxShadow: "inset -6px 0 24px -4px rgba(207, 157, 123, 0.18)",
          transition: "box-shadow 0.1s ease",
        }
      : edgeShadow === "right"
        ? {
            boxShadow: "inset 6px 0 24px -4px rgba(207, 157, 123, 0.18)",
            transition: "box-shadow 0.1s ease",
          }
        : {
            transition: "box-shadow 0.2s ease",
          };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={edgeStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className="w-full min-h-screen"
    >
      {children}
    </div>
  );
}
