"use client";

/**
 * F27.3 — Индикатор источника вопросов на экране батла.
 * Показывает «Вопросы из уровня: N» — связка батла с системой обучения.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const LEVEL_LABELS: Record<string, string> = {
  SLEEPING: "Спящий",
  AWAKENING: "Пробуждённый",
  OBSERVER: "Наблюдатель",
  WARRIOR: "Воин",
  STRATEGIST: "Стратег",
  MASTER: "Мастер",
};

export default function QuestionSourceIndicator() {
  const { accessToken } = useAuth();
  const [levelName, setLevelName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/learning/status`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.hasPath) {
          const label =
            data.currentLevelName ??
            LEVEL_LABELS[data.currentLevel as string] ??
            null;
          setLevelName(label);
        }
      } catch {
        // бэкенд недоступен — индикатор просто не показывается
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!levelName) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-ritual tracking-[0.3em] uppercase text-text-muted py-1.5">
      <span className="w-6 h-px bg-cold-steel/40" />
      <span>
        Вопросы из уровня{" "}
        <span className="text-cold-steel">«{levelName}»</span>
      </span>
      <span className="w-6 h-px bg-cold-steel/40" />
    </div>
  );
}
