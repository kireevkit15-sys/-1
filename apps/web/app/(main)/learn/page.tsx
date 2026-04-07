"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useApiToken } from "@/hooks/useApiToken";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

interface ModuleItem {
  id: string;
  title: string;
  description?: string;
  branch: string;
  order: number;
  questionCount?: number;
  progress?: {
    completedQuestions: number;
    totalQuestions: number;
    isCompleted: boolean;
  };
}

interface BranchData {
  id: string;
  title: string;
  color: "accent-red" | "accent-gold";
  modules: ModuleItem[];
}

const colorMap: Record<string, { bg: string; text: string; progress: string }> = {
  "accent-red": { bg: "bg-accent-red/20", text: "text-accent-red", progress: "bg-accent-red" },
  "accent-gold": { bg: "bg-accent-gold/20", text: "text-accent-gold", progress: "bg-accent-gold" },
};

const FALLBACK_BRANCHES: BranchData[] = [
  {
    id: "STRATEGY",
    title: "Стратегическое мышление",
    color: "accent-red",
    modules: [
      { id: "demo-s1", title: "Основы стратегии", branch: "STRATEGY", order: 1, progress: { completedQuestions: 5, totalQuestions: 5, isCompleted: true } },
      { id: "demo-s2", title: "Теория игр", branch: "STRATEGY", order: 2, progress: { completedQuestions: 3, totalQuestions: 8, isCompleted: false } },
      { id: "demo-s3", title: "Принятие решений", branch: "STRATEGY", order: 3, progress: { completedQuestions: 1, totalQuestions: 6, isCompleted: false } },
      { id: "demo-s4", title: "Системное мышление", branch: "STRATEGY", order: 4, progress: { completedQuestions: 0, totalQuestions: 7, isCompleted: false } },
    ],
  },
  {
    id: "LOGIC",
    title: "Логика и аргументация",
    color: "accent-gold",
    modules: [
      { id: "demo-l1", title: "Формальная логика", branch: "LOGIC", order: 1, progress: { completedQuestions: 6, totalQuestions: 6, isCompleted: true } },
      { id: "demo-l2", title: "Логические ошибки", branch: "LOGIC", order: 2, progress: { completedQuestions: 8, totalQuestions: 10, isCompleted: false } },
      { id: "demo-l3", title: "Критический анализ", branch: "LOGIC", order: 3, progress: { completedQuestions: 2, totalQuestions: 8, isCompleted: false } },
      { id: "demo-l4", title: "Дедукция и индукция", branch: "LOGIC", order: 4, progress: { completedQuestions: 0, totalQuestions: 5, isCompleted: false } },
    ],
  },
];

function getProgress(mod: ModuleItem): number {
  if (!mod.progress || mod.progress.totalQuestions === 0) return 0;
  return Math.round(
    (mod.progress.completedQuestions / mod.progress.totalQuestions) * 100,
  );
}

function ProgressBar({ progress, colorClass }: { progress: number; colorClass: string }) {
  return (
    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function LearnPage() {
  const token = useApiToken();
  const [branches, setBranches] = useState<BranchData[]>(FALLBACK_BRANCHES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModules() {
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      try {
        const [stratRes, logicRes] = await Promise.allSettled([
          fetch(`${API_BASE}/modules?branch=STRATEGY`, { headers }),
          fetch(`${API_BASE}/modules?branch=LOGIC`, { headers }),
        ]);

        const result: BranchData[] = [];

        if (stratRes.status === "fulfilled" && stratRes.value.ok) {
          const data = await stratRes.value.json();
          const mods = Array.isArray(data) ? data : data.data || [];
          if (mods.length > 0) {
            result.push({
              id: "STRATEGY",
              title: "Стратегическое мышление",
              color: "accent-red",
              modules: mods,
            });
          }
        }

        if (logicRes.status === "fulfilled" && logicRes.value.ok) {
          const data = await logicRes.value.json();
          const mods = Array.isArray(data) ? data : data.data || [];
          if (mods.length > 0) {
            result.push({
              id: "LOGIC",
              title: "Логика и аргументация",
              color: "accent-gold",
              modules: mods,
            });
          }
        }

        if (result.length > 0) {
          setBranches(result);
        }
      } catch {}
      setLoading(false);
    }
    fetchModules();
  }, [token]);

  return (
    <div className="px-4 pt-12 pb-24 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Обучение</h1>
        <p className="text-text-muted text-sm mt-1">
          Прокачивай навыки мышления по модулям
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Branches */}
      {branches.map((branch) => {
        const colors = colorMap[branch.color] ?? { bg: "bg-accent/20", text: "text-accent", progress: "bg-accent" };
        return (
        <div key={branch.id} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className={`w-2 h-2 rounded-full ${colors.progress}`} />
            <h2 className="font-semibold text-sm">{branch.title}</h2>
          </div>

          {branch.modules.map((mod, idx) => {
            const pct = getProgress(mod);
            const prevPct = idx > 0 ? getProgress(branch.modules[idx - 1] as ModuleItem) : 100;
            const isLocked = pct === 0 && idx > 0 && prevPct < 100;

            const cardContent = (
              <Card
                key={mod.id}
                padding="sm"
                className={`space-y-3 ${isLocked ? "opacity-60" : "cursor-pointer active:scale-[0.99] transition-transform"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        pct === 100
                          ? `${colors.bg} ${colors.text}`
                          : pct > 0
                          ? "bg-surface-light text-white/60"
                          : "bg-surface-light text-text-muted"
                      }`}
                    >
                      {pct === 100 ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      ) : isLocked ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      ) : idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-text-muted">
                        {mod.progress
                          ? `${mod.progress.completedQuestions}/${mod.progress.totalQuestions} вопросов`
                          : `${mod.questionCount ?? 5} вопросов`}
                      </p>
                    </div>
                  </div>
                  {pct > 0 && (
                    <span className={`text-xs font-semibold ${pct === 100 ? colors.text : "text-text-muted"}`}>
                      {pct}%
                    </span>
                  )}
                </div>
                {pct > 0 && pct < 100 && (
                  <ProgressBar progress={pct} colorClass={colors.progress} />
                )}
              </Card>
            );

            if (isLocked) return <div key={mod.id}>{cardContent}</div>;
            return (
              <Link key={mod.id} href={`/learn/${mod.id}`}>
                {cardContent}
              </Link>
            );
          })}
        </div>
        );
      })}

      {/* AI Dialogues link */}
      <Link
        href="/learn/dialogues"
        className="block"
      >
        <Card padding="md" className="flex items-center gap-3 hover:border-accent/20 transition-colors">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">AI-диалоги</p>
            <p className="text-xs text-text-muted">История бесед с наставником</p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
