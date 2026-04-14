"use client";

/**
 * Общая обёртка ритуальных экранов (определение, путь, барьер).
 * Aurora-фон + виньетка + холодные пятна света.
 */

import type { ReactNode } from "react";

interface RitualShellProps {
  children: ReactNode;
}

export default function RitualShell({ children }: RitualShellProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Стальное пятно — слева сверху */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-[120px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(107,125,140,0.32) 0%, rgba(107,125,140,0) 70%)",
        }}
      />
      {/* Кровавое пятно — справа снизу, со смещением фазы */}
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-32 w-[560px] h-[560px] rounded-full blur-[140px] z-0 animate-aurora-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(139,46,46,0.24) 0%, rgba(139,46,46,0) 70%)",
          animationDelay: "-9s",
        }}
      />
      {/* Виньетка по краям */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
