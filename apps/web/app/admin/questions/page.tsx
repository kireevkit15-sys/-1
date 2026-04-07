"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import QuestionEditor from "@/components/admin/QuestionEditor";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  branch: string;
  category: string;
  difficulty: string;
  isActive?: boolean;
}

interface Filters {
  branch: string;
  difficulty: string;
  category: string;
  page: number;
}

const DEMO_QUESTIONS: Question[] = [
  { id: "1", text: "Какой принцип лежит в основе дилеммы заключённого?", options: ["Кооперация", "Индивидуальный рационализм", "Случайность", "Доминирование"], correctIndex: 1, explanation: "...", branch: "STRATEGY", category: "game_theory", difficulty: "BRONZE" },
  { id: "2", text: "Что такое равновесие Нэша?", options: ["Баланс сил", "Оптимальное решение", "Нет стимула отклоняться", "Ничья"], correctIndex: 2, explanation: "...", branch: "STRATEGY", category: "game_theory", difficulty: "SILVER" },
  { id: "3", text: "Modus ponens — это:", options: ["Отрицание следствия", "Утверждение основания", "Дизъюнкция", "Индукция"], correctIndex: 1, explanation: "...", branch: "LOGIC", category: "formal_logic", difficulty: "BRONZE" },
  { id: "4", text: "Какая ошибка в аргументе 'ad hominem'?", options: ["Ложная причина", "Атака на личность", "Круговое рассуждение", "Ложная дилемма"], correctIndex: 1, explanation: "...", branch: "LOGIC", category: "fallacies", difficulty: "SILVER" },
  { id: "5", text: "SWOT-анализ оценивает:", options: ["Финансы", "S/W/O/T", "Конкурентов", "Рынок"], correctIndex: 1, explanation: "...", branch: "STRATEGY", category: "decision_making", difficulty: "GOLD" },
];

const branchLabels: Record<string, string> = { STRATEGY: "Стратегия", LOGIC: "Логика" };
const difficultyLabels: Record<string, string> = { BRONZE: "Бронза", SILVER: "Серебро", GOLD: "Золото" };

export default function AdminQuestionsPage() {
  const token = useApiToken();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({ branch: "", difficulty: "", category: "", page: 1 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.branch) params.set("branch", filters.branch);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.category) params.set("category", filters.category);
      params.set("page", String(filters.page));
      params.set("limit", "20");

      const res = await fetch(`${API_BASE}/questions?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(Array.isArray(data) ? data : data.items || data.data || []);
        setTotal(data.total || data.length || 0);
      } else {
        setQuestions(DEMO_QUESTIONS);
        setTotal(DEMO_QUESTIONS.length);
      }
    } catch {
      setQuestions(DEMO_QUESTIONS);
      setTotal(DEMO_QUESTIONS.length);
    }
    setLoading(false);
  }, [filters, token]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDeactivate = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/questions/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, [token]);

  const handleSaved = useCallback((updated: Question) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    setEditing(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Вопросы</h1>
          <p className="text-text-secondary text-sm mt-1">
            {total} вопросов в базе
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.branch}
          onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value, page: 1 }))}
          className="bg-surface border border-accent/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/30"
        >
          <option value="">Все ветки</option>
          <option value="STRATEGY">Стратегия</option>
          <option value="LOGIC">Логика</option>
        </select>
        <select
          value={filters.difficulty}
          onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value, page: 1 }))}
          className="bg-surface border border-accent/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/30"
        >
          <option value="">Все сложности</option>
          <option value="BRONZE">Бронза</option>
          <option value="SILVER">Серебро</option>
          <option value="GOLD">Золото</option>
        </select>
        <input
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
          placeholder="Категория..."
          className="bg-surface border border-accent/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30"
        />
      </div>

      {/* Questions table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <Card key={q.id} padding="md" className="hover:border-accent/20 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary line-clamp-2">
                    {q.text}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-accent-warm/15 text-accent">
                      {branchLabels[q.branch] || q.branch}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md ${
                        q.difficulty === "GOLD"
                          ? "bg-accent-gold/15 text-accent-gold"
                          : q.difficulty === "SILVER"
                            ? "bg-accent-silver/15 text-accent-silver"
                            : "bg-accent-bronze/15 text-accent-bronze"
                      }`}
                    >
                      {difficultyLabels[q.difficulty] || q.difficulty}
                    </span>
                    {q.category && (
                      <span className="text-xs text-text-muted">
                        {q.category.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(q)}
                    className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center text-text-muted hover:text-accent transition-colors"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeactivate(q.id)}
                    className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center text-text-muted hover:text-accent-red transition-colors"
                    title="Деактивировать"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
            disabled={filters.page <= 1}
            className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg disabled:opacity-40 text-text-secondary hover:text-text-primary transition-colors"
          >
            Назад
          </button>
          <span className="text-sm text-text-muted">
            {filters.page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            disabled={filters.page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg disabled:opacity-40 text-text-secondary hover:text-text-primary transition-colors"
          >
            Далее
          </button>
        </div>
      )}

      {/* Question Editor overlay */}
      {editing && (
        <QuestionEditor
          question={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
