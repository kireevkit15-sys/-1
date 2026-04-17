"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { useApiToken } from "@/hooks/useApiToken";
import { API_BASE } from "@/lib/api/base";

interface ReportedQuestion {
  id: string;
  text: string;
  branch: string;
  difficulty: string;
  category: string;
  reportCount: number;
}

const DEMO_REPORTS: ReportedQuestion[] = [
  { id: "r1", text: "Вопрос с ошибкой в формулировке дилеммы заключённого — ни один вариант не верен", branch: "STRATEGY", difficulty: "SILVER", category: "game_theory", reportCount: 5 },
  { id: "r2", text: "Неверный правильный ответ в вопросе про силлогизмы", branch: "LOGIC", difficulty: "BRONZE", category: "formal_logic", reportCount: 3 },
  { id: "r3", text: "Дублирующийся вопрос о когнитивных искажениях", branch: "STRATEGY", difficulty: "GOLD", category: "cognitive_biases", reportCount: 2 },
];

const difficultyColors: Record<string, string> = {
  BRONZE: "bg-accent-bronze/15 text-accent-bronze",
  SILVER: "bg-accent-silver/15 text-accent-silver",
  GOLD: "bg-accent-gold/15 text-accent-gold",
};

export default function AdminReportsPage() {
  const token = useApiToken();
  const [reports, setReports] = useState<ReportedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch(`${API_BASE}/questions/reported`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setReports(Array.isArray(data) ? data : []);
        } else {
          setReports(DEMO_REPORTS);
        }
      } catch {
        setReports(DEMO_REPORTS);
      }
      setLoading(false);
    }
    fetchReports();
  }, [token]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/questions/${id}/report`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, [token]);

  const handleDeactivate = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/questions/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Жалобы</h1>
        <p className="text-text-secondary text-sm mt-1">
          {reports.length} вопросов с жалобами
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-surface border border-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm">Жалоб нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id} padding="md">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-text-primary line-clamp-2 flex-1">
                    {r.text}
                  </p>
                  <span className="flex-shrink-0 bg-accent-red/15 text-accent-red text-xs font-medium px-2 py-0.5 rounded-md">
                    {r.reportCount} жалоб
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-accent-warm/15 text-accent">
                    {{ STRATEGY: "Стратегия", LOGIC: "Логика", ERUDITION: "Эрудиция", RHETORIC: "Риторика", INTUITION: "Интуиция" }[r.branch] || r.branch}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${difficultyColors[r.difficulty] || ""}`}>
                    {r.difficulty === "GOLD" ? "Золото" : r.difficulty === "SILVER" ? "Серебро" : "Бронза"}
                  </span>
                  {r.category && (
                    <span className="text-xs text-text-muted">{r.category.replace(/_/g, " ")}</span>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleDismiss(r.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-light text-text-secondary rounded-lg hover:text-text-primary transition-colors"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => handleDeactivate(r.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-accent-red/10 text-accent-red rounded-lg hover:bg-accent-red/20 transition-colors"
                  >
                    Деактивировать
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
