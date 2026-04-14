"use client";

/**
 * Иконки уровней системы обучения — единый геометрический стиль.
 * Серия посвящений: от закрытого круга до полной мандалы.
 */

import type { LevelKey } from "@/lib/learning/levels";

interface LevelIconProps {
  level: LevelKey;
  className?: string;
}

export default function LevelIcon({ level, className = "" }: LevelIconProps) {
  const props = {
    className,
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (level) {
    case "SLEEPING":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" opacity="0.6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case "AWAKENING":
      return (
        <svg {...props}>
          <path d="M3 12a9 9 0 1 0 9-9" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "OBSERVER":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "WARRIOR":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 2v20" strokeWidth="1.8" />
        </svg>
      );
    case "STRATEGIST":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 5 L19 18 L5 18 Z" />
        </svg>
      );
    case "MASTER":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3 L20 17 L4 17 Z" />
          <path d="M12 21 L4 7 L20 7 Z" />
        </svg>
      );
  }
}
