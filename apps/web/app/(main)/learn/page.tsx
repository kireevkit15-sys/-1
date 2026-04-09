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

// Maps branch key → CSS identity class (sets --branch-color & --branch-hex)
const branchIdentityClass: Record<string, string> = {
  STRATEGY:  "branch-strategy",
  LOGIC:     "branch-logic",
  ERUDITION: "branch-erudition",
  RHETORIC:  "branch-rhetoric",
  INTUITION: "branch-intuition",
};

// Dot color for section headers — inline hex so no Tailwind purge issues
const branchDotHex: Record<string, string> = {
  STRATEGY:  "#06B6D4",
  LOGIC:     "#22C55E",
  ERUDITION: "#A855F7",
  RHETORIC:  "#F97316",
  INTUITION: "#EC4899",
};

const branchConfig: { key: string; title: string; color: string }[] = [
  { key: "STRATEGY",  title: "Стратегическое мышление", color: "accent-red" },
  { key: "LOGIC",     title: "Логика и аргументация",   color: "accent-gold" },
  { key: "ERUDITION", title: "Эрудиция",                color: "branch-erudition" },
  { key: "RHETORIC",  title: "Риторика",                color: "branch-rhetoric" },
  { key: "INTUITION", title: "Интуиция",                color: "branch-intuition" },
];

// Branch SVG icons
function BranchIcon({ branchKey, className = "w-4 h-4" }: { branchKey: string; className?: string }) {
  switch (branchKey) {
    case "STRATEGY":
      // Crown / chess piece
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 20h14v-2H5v2zm7-18l-2 6H6l4 3-1.5 5h7L14 11l4-3h-4L12 2z" />
        </svg>
      );
    case "LOGIC":
      // Circuit / brain nodes
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="5"  cy="6"  r="2" />
          <circle cx="19" cy="6"  r="2" />
          <circle cx="5"  cy="18" r="2" />
          <circle cx="19" cy="18" r="2" />
          <circle cx="12" cy="12" r="2.5" />
          <line x1="7"  y1="6"  x2="10" y2="11" />
          <line x1="17" y1="6"  x2="14" y2="11" />
          <line x1="7"  y1="18" x2="10" y2="13" />
          <line x1="17" y1="18" x2="14" y2="13" />
        </svg>
      );
    case "ERUDITION":
      // Open book / scroll
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.5 5 8 4.5 5 5v14c3-.5 5.5 0 7 1.5 1.5-1.5 4-2 7-1.5V5c-3-.5-5.5 0-7 1.5z" />
          <line x1="12" y1="6.5" x2="12" y2="20" />
        </svg>
      );
    case "RHETORIC":
      // Speech bubble
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "INTUITION":
      // Eye with star glint
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M17 4l.5 1.5L19 6l-1.5.5L17 8l-.5-1.5L15 6l1.5-.5L17 4z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
      <div
        className="h-full branch-progress rounded-full transition-all"
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
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: branchDotHex[cfg.key] }}
                />
                <h2 className="font-semibold text-sm">{cfg.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ModuleSkeleton />
                <ModuleSkeleton />
                <ModuleSkeleton />
              </div>
            </div>
          ))}
        </>
      )}

      {/* Branches */}
      {!loading && branches.map((branch) => {
        const branchKey = branch.id.toUpperCase();
        const identityClass = branchIdentityClass[branchKey] ?? "";
        const dotHex = branchDotHex[branchKey] ?? "#888";

        return (
          <div key={branch.id} className="space-y-3">
            {/* Branch header */}
            <div className="flex items-center gap-2 px-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: dotHex }}
              />
              <h2 className="font-semibold text-sm">{branch.title}</h2>
            </div>

            {branch.modules.length === 0 && (
              <p className="text-text-muted text-sm px-1">Модули пока недоступны</p>
            )}

            {/* 2-column grid on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branch.modules.map((mod, idx) => {
                const isLocked = mod.progress === 0 && idx > 0 && (branch.modules[idx - 1]?.progress ?? 0) < 100;

                return (
                  <Card
                    key={mod.id ?? mod.title}
                    padding="sm"
                    className={`${identityClass} branch-card hover-lift space-y-3 ${isLocked ? "opacity-60" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Module index / status icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold branch-icon ${
                            mod.progress > 0 ? "" : isLocked ? "opacity-50" : ""
                          }`}
                        >
                          {mod.progress === 100 ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : isLocked ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          ) : (
                            <BranchIcon branchKey={branchKey} className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-medium">{mod.title}</p>
                          <p className="text-xs text-text-muted">{mod.lessons} уроков</p>
                        </div>
                      </div>

                      {mod.progress > 0 && (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: mod.progress === 100 ? dotHex : undefined }}
                        >
                          {mod.progress}%
                        </span>
                      )}
                    </div>

                    {/* Progress bar — uses branch-progress CSS class which reads --branch-color */}
                    {mod.progress > 0 && mod.progress < 100 && (
                      <ProgressBar progress={mod.progress} />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
