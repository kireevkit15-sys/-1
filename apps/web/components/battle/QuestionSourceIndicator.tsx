"use client";

/**
 * F27.3 — Индикатор источника вопросов на экране батла.
 * Показывает «Вопросы из уровня: N» — связка батла с системой обучения.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getStatus } from "@/lib/api/learning";
import { getLevelName } from "@/lib/learning/levels";

// Кеш на сессию: уровень меняется редко, нет смысла дергать API
// при каждом монтировании компонента батла.
const STORAGE_KEY = "learning:level-name";

export default function QuestionSourceIndicator() {
  const { accessToken } = useAuth();
  const [levelName, setLevelName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getStatus(accessToken);
        if (cancelled) return;
        if (data.hasPath) {
          const label =
            data.currentLevelName ?? getLevelName(data.currentLevel);
          setLevelName(label);
          sessionStorage.setItem(STORAGE_KEY, label);
        }
      } catch {
        // Бэкенд недоступен или ошибка — тихо не показываем индикатор.
        // Если был кеш — оставляем последнее известное значение.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!levelName) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-ritual tracking-[0.3em] uppercase text-text-muted py-1.5"
      aria-label={`Вопросы из уровня ${levelName}`}
    >
      <span aria-hidden className="w-6 h-px bg-cold-steel/40" />
      <span>
        Вопросы из уровня{" "}
        <span className="text-cold-steel">«{levelName}»</span>
      </span>
      <span aria-hidden className="w-6 h-px bg-cold-steel/40" />
    </div>
  );
}
