/**
 * Единый источник правды для конфига 5 веток знаний.
 * До рефакторинга эти же цвета/метки дублировались в 10+ файлов.
 */

export type BranchKey =
  | "STRATEGY"
  | "LOGIC"
  | "ERUDITION"
  | "RHETORIC"
  | "INTUITION";

export interface BranchMeta {
  key: BranchKey;
  label: string;
  color: string;
  rgb: string;
  iconPath: string;
}

export const BRANCHES: Record<BranchKey, BranchMeta> = {
  STRATEGY: {
    key: "STRATEGY",
    label: "Стратегия",
    color: "#06B6D4",
    rgb: "6,182,212",
    iconPath:
      "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  },
  LOGIC: {
    key: "LOGIC",
    label: "Логика",
    color: "#22C55E",
    rgb: "34,197,94",
    iconPath:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  ERUDITION: {
    key: "ERUDITION",
    label: "Эрудиция",
    color: "#A855F7",
    rgb: "168,85,247",
    iconPath:
      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  RHETORIC: {
    key: "RHETORIC",
    label: "Риторика",
    color: "#F97316",
    rgb: "249,115,22",
    iconPath:
      "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  INTUITION: {
    key: "INTUITION",
    label: "Интуиция",
    color: "#EC4899",
    rgb: "236,72,153",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
};

export const DEFAULT_BRANCH: BranchMeta = BRANCHES.STRATEGY;

export function getBranch(branch?: string | null): BranchMeta {
  if (!branch) return DEFAULT_BRANCH;
  const key = branch.toUpperCase() as BranchKey;
  return BRANCHES[key] ?? DEFAULT_BRANCH;
}

export function branchAlpha(branch: BranchMeta, alpha: number): string {
  return `rgba(${branch.rgb},${alpha})`;
}
