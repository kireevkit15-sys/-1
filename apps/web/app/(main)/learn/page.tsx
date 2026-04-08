"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModuleData {
  id: string;
  title: string;
  progress: number;
  lessons: number;
}

interface BranchData {
  id: string;
  title: string;
  color: string;
  modules: ModuleData[];
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchJson<T>(
  url: string,
  token: string | null,
): Promise<T | null> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-light ${className}`}
    />
  );
}

function ModuleSkeleton() {
  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const colorMap: Record<string, { bg: string; text: string; progress: string }> = {
  "accent-red": { bg: "bg-accent-red/20", text: "text-accent-red", progress: "bg-accent-red" },
  "accent-gold": { bg: "bg-accent-gold/20", text: "text-accent-gold", progress: "bg-accent-gold" },
  "branch-erudition": { bg: "bg-[#a855f7]/20", text: "text-[#a855f7]", progress: "bg-[#a855f7]" },
  "branch-rhetoric": { bg: "bg-[#f97316]/20", text: "text-[#f97316]", progress: "bg-[#f97316]" },
  "branch-intuition": { bg: "bg-[#ec4899]/20", text: "text-[#ec4899]", progress: "bg-[#ec4899]" },
};

const branchConfig: { key: string; title: string; color: string }[] = [
  { key: "STRATEGY", title: "Стратегическое мышление", color: "accent-red" },
  { key: "LOGIC", title: "Логика и аргументация", color: "accent-gold" },
  { key: "ERUDITION", title: "Эрудиция", color: "branch-erudition" },
  { key: "RHETORIC", title: "Риторика", color: "branch-rhetoric" },
  { key: "INTUITION", title: "Интуиция", color: "branch-intuition" },
];

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
  const { accessToken, isLoading: authLoading } = useAuth();

  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);

      const results = await Promise.all(
        branchConfig.map(async (cfg) => {
          const modules = await fetchJson<ModuleData[]>(
            `${API_BASE}/v1/modules?branch=${cfg.key}`,
            accessToken,
          );
          return {
            id: cfg.key.toLowerCase(),
            title: cfg.title,
            color: cfg.color,
            modules: modules ?? [],
          };
        }),
      );

      setBranches(results);
      setLoading(false);
    }

    load();
  }, [accessToken, authLoading]);

  return (
    <div className="px-4 pt-12 pb-24 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Обучение</h1>
        <p className="text-text-muted text-sm mt-1">
          Прокачивай навыки мышления по модулям
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <>
          {branchConfig.map((cfg) => (
            <div key={cfg.key} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className={`w-2 h-2 rounded-full ${colorMap[cfg.color]?.progress}`} />
                <h2 className="font-semibold text-sm">{cfg.title}</h2>
              </div>
              <ModuleSkeleton />
              <ModuleSkeleton />
              <ModuleSkeleton />
            </div>
          ))}
        </>
      )}

      {/* Branches */}
      {!loading && branches.map((branch) => (
        <div key={branch.id} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className={`w-2 h-2 rounded-full ${colorMap[branch.color]?.progress}`} />
            <h2 className="font-semibold text-sm">{branch.title}</h2>
          </div>

          {branch.modules.length === 0 && (
            <p className="text-text-muted text-sm px-1">Модули пока недоступны</p>
          )}

          {branch.modules.map((mod, idx) => {
            const isLocked = mod.progress === 0 && idx > 0 && (branch.modules[idx - 1]?.progress ?? 0) < 100;

            return (
              <Card
                key={mod.id ?? mod.title}
                padding="sm"
                className={`space-y-3 ${isLocked ? "opacity-60" : "cursor-pointer active:scale-[0.99] transition-transform"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        mod.progress === 100
                          ? `${colorMap[branch.color]?.bg} ${colorMap[branch.color]?.text}`
                          : mod.progress > 0
                          ? "bg-surface-light text-white/60"
                          : "bg-surface-light text-text-muted"
                      }`}
                    >
                      {mod.progress === 100 ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      ) : isLocked ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      ) : idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-text-muted">{mod.lessons} уроков</p>
                    </div>
                  </div>
                  {mod.progress > 0 && (
                    <span className={`text-xs font-semibold ${mod.progress === 100 ? colorMap[branch.color]?.text : "text-text-muted"}`}>
                      {mod.progress}%
                    </span>
                  )}
                </div>
                {mod.progress > 0 && mod.progress < 100 && (
                  <ProgressBar progress={mod.progress} colorClass={colorMap[branch.color]?.progress ?? "bg-accent"} />
                )}
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
