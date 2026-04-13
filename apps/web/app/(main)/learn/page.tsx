"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignData {
  id: string;
  title: string;
  description: string;
  branch: string;
  durationDays: number;
  started?: boolean;
  currentDay?: number;
  completedDays?: number;
  progress?: number;
}

interface BranchData {
  id: string;
  title: string;
  color: string;
  campaigns: CampaignData[];
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

function CampaignSkeleton() {
  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="w-40 h-4" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-1.5" />
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
function BranchIcon({ branchKey, className = "w-4 h-4", style }: { branchKey: string; className?: string; style?: React.CSSProperties }) {
  switch (branchKey) {
    case "STRATEGY":
      // Crown / chess piece
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 20h14v-2H5v2zm7-18l-2 6H6l4 3-1.5 5h7L14 11l4-3h-4L12 2z" />
        </svg>
      );
    case "LOGIC":
      // Circuit / brain nodes
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.5 5 8 4.5 5 5v14c3-.5 5.5 0 7 1.5 1.5-1.5 4-2 7-1.5V5c-3-.5-5.5 0-7 1.5z" />
          <line x1="12" y1="6.5" x2="12" y2="20" />
        </svg>
      );
    case "RHETORIC":
      // Speech bubble
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "INTUITION":
      // Eye with star glint
      return (
        <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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

// ---------------------------------------------------------------------------
// Knowledge Tree component (F8.1)
// ---------------------------------------------------------------------------

interface TreeNode {
  key: string;
  title: string;
  shortTitle: string;
  hex: string;
  progress: number;
}

// Pentagonal positions for 5 nodes (% of container, relative to center)
// Top, top-right, bottom-right, bottom-left, top-left
const PENTA_POSITIONS: { x: number; y: number }[] = [
  { x: 50,   y: 8  },   // STRATEGY  — top
  { x: 88,   y: 36 },   // LOGIC     — top-right
  { x: 74,   y: 80 },   // ERUDITION — bottom-right
  { x: 26,   y: 80 },   // RHETORIC  — bottom-left
  { x: 12,   y: 36 },   // INTUITION — top-left
];

function KnowledgeTree({
  branches,
  onNodeClick,
}: {
  branches: BranchData[];
  onNodeClick: (key: string) => void;
}) {
  const nodes: TreeNode[] = branchConfig.map((cfg) => {
    const branch = branches.find((b) => b.id === cfg.key.toLowerCase());
    const totalProgress =
      branch && branch.campaigns.length > 0
        ? Math.round(
            branch.campaigns.reduce((sum, c) => sum + (c.progress ?? 0), 0) /
              branch.campaigns.length,
          )
        : 0;
    return {
      key: cfg.key,
      title: cfg.title,
      shortTitle: cfg.title.split(" ")[0] ?? cfg.title,
      hex: branchDotHex[cfg.key] ?? "#888",
      progress: totalProgress,
    };
  });

  const cx = 50; // center x %
  const cy = 50; // center y %

  return (
    <>
      {/* ── Desktop / tablet: pentagonal radial map ── */}
      <div className="hidden sm:block relative w-full" style={{ paddingBottom: "88%" }}>
        {/* SVG lines layer */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {PENTA_POSITIONS.map((pos, i) => (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={pos.x}
              y2={pos.y}
              stroke={nodes[i]?.hex ?? "#888"}
              strokeWidth="0.5"
              strokeOpacity="0.35"
              strokeDasharray="1.5 1"
            />
          ))}
        </svg>

        {/* Central РАЗУМ node */}
        <div
          className="absolute z-10 flex flex-col items-center"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, rgba(207,157,123,0.22), rgba(207,157,123,0.06))",
              border: "1px solid rgba(207,157,123,0.35)",
              boxShadow:
                "0 0 24px rgba(207,157,123,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <span className="text-[9px] font-bold text-metallic tracking-widest">
              РАЗУМ
            </span>
          </div>
        </div>

        {/* Branch nodes */}
        {nodes.map((node, i) => {
          const pos = PENTA_POSITIONS[i]!;
          return (
            <button
              key={node.key}
              onClick={() => onNodeClick(node.key.toLowerCase())}
              className="absolute z-10 flex flex-col items-center gap-1.5 group"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Circle */}
              <div
                className={`branch-${node.key.toLowerCase()} relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110`}
                style={{
                  background: `radial-gradient(circle at 35% 35%, rgba(${
                    branchColorRgb[node.key]
                  }, 0.25), rgba(${branchColorRgb[node.key]}, 0.06))`,
                  border: `1px solid rgba(${branchColorRgb[node.key]}, 0.45)`,
                  boxShadow: `0 0 16px rgba(${branchColorRgb[node.key]}, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)`,
                }}
              >
                <BranchIcon branchKey={node.key} className="w-5 h-5" style={{ color: node.hex } as React.CSSProperties} />
                {/* Progress arc ring */}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 48 48"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke={node.hex}
                    strokeOpacity="0.15"
                    strokeWidth="2"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke={node.hex}
                    strokeOpacity="0.8"
                    strokeWidth="2"
                    strokeDasharray={`${(node.progress / 100) * 138.2} 138.2`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {/* Label */}
              <div className="text-center max-w-[72px]">
                <p className="text-[10px] font-semibold leading-tight text-text-primary">
                  {node.shortTitle}
                </p>
                <p
                  className="text-[9px] font-bold"
                  style={{ color: node.hex }}
                >
                  {node.progress}%
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Mobile: horizontal scrollable chip row ── */}
      <div className="sm:hidden flex gap-3 overflow-x-auto pb-2 px-0.5 scrollbar-none">
        {nodes.map((node) => (
          <button
            key={node.key}
            onClick={() => onNodeClick(node.key.toLowerCase())}
            className={`branch-${node.key.toLowerCase()} flex-none flex items-center gap-2 px-3 py-2 rounded-full transition-all active:scale-95`}
            style={{
              background: `rgba(${branchColorRgb[node.key]}, 0.1)`,
              border: `1px solid rgba(${branchColorRgb[node.key]}, 0.3)`,
            }}
          >
            <BranchIcon branchKey={node.key} className="w-4 h-4 flex-none" style={{ color: node.hex } as React.CSSProperties} />
            <div className="text-left">
              <p className="text-[11px] font-semibold text-text-primary whitespace-nowrap">
                {node.shortTitle}
              </p>
              <p className="text-[10px] font-bold" style={{ color: node.hex }}>
                {node.progress}%
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// RGB values for inline use (matches branchDotHex)
const branchColorRgb: Record<string, string> = {
  STRATEGY:  "6, 182, 212",
  LOGIC:     "34, 197, 94",
  ERUDITION: "168, 85, 247",
  RHETORIC:  "249, 115, 22",
  INTUITION: "236, 72, 153",
};

export default function LearnPage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBranch = searchParams.get("branch")?.toUpperCase() ?? null;

  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function load() {
      setLoading(true);

      const allCampaigns = await fetchJson<CampaignData[]>(
        `${API_BASE}/v1/campaigns`,
        accessToken,
      );

      const results = branchConfig.map((cfg) => {
        const branchCampaigns = (allCampaigns ?? []).filter(
          (c) => c.branch === cfg.key,
        );
        return {
          id: cfg.key.toLowerCase(),
          title: cfg.title,
          color: cfg.color,
          campaigns: branchCampaigns,
        };
      });

      setBranches(results);
      setLoading(false);
    }

    load();
  }, [accessToken, authLoading]);

  function handleNodeClick(key: string) {
    router.push(`/learn?branch=${key.toLowerCase()}`);
  }

  // Find selected branch data
  const activeBranch = selectedBranch
    ? branches.find((b) => b.id === selectedBranch.toLowerCase())
    : null;
  const activeBranchKey = selectedBranch ?? "";
  const activeIdentityClass = branchIdentityClass[activeBranchKey] ?? "";
  const activeDotHex = branchDotHex[activeBranchKey] ?? "#888";
  const activeCfg = branchConfig.find((c) => c.key === activeBranchKey);

  // Collect active campaigns across all branches (started but not 100%)
  const activeCampaigns = branches
    .flatMap((b) => b.campaigns)
    .filter((c) => c.started && (c.progress ?? 0) < 100)
    .slice(0, 2);

  return (
    <div className="px-4 pt-12 pb-24 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-metallic">Обучение</h1>
        <p className="text-text-muted text-sm mt-1">
          Карта знаний, кампании и лента
        </p>
      </div>

      {/* Knowledge Tree (F8.1) */}
      <div className="glass-card p-4">
        <p className="text-xs text-text-muted mb-4 font-medium tracking-wider uppercase">
          Карта знаний
        </p>
        <KnowledgeTree branches={branches} onNodeClick={handleNodeClick} />
      </div>

      {/* ── Feed CTA Banner ── */}
      {!selectedBranch && (
        <Link href="/feed" className="block">
          <div
            className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
            style={{
              background: "linear-gradient(135deg, rgba(207,157,123,0.15) 0%, rgba(207,157,123,0.04) 100%)",
              border: "1px solid rgba(207,157,123,0.25)",
            }}
          >
            {/* Decorative glow */}
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(207,157,123,0.2) 0%, transparent 70%)" }}
            />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  {/* Sword icon */}
                  <svg className="w-5 h-5 text-metallic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 2l5.5 5.5-11 11L3.5 13 14.5 2zM3 21l3.5-3.5M7.5 14l2.5 2.5" />
                  </svg>
                  <h2 className="text-lg font-bold text-metallic">Лента Воина</h2>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Учись через ленту: свайпай, отвечай, сражайся
                </p>
              </div>
              <div
                className="flex-none self-start sm:self-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, rgba(207,157,123,0.9), rgba(207,157,123,0.7))",
                  boxShadow: "0 4px 16px rgba(207,157,123,0.3)",
                }}
              >
                Открыть ленту
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ── Active Campaigns (when no branch selected) ── */}
      {!selectedBranch && !loading && activeCampaigns.length > 0 && (
        <div className="space-y-3" style={{ animation: "onboarding-fade-in 0.4s ease-out" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted font-medium tracking-wider uppercase">
              Активные кампании
            </p>
            <Link href="/campaigns" className="text-xs text-metallic font-medium hover:underline">
              Все кампании
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCampaigns.map((campaign) => {
              const campColor = branchDotHex[campaign.branch] ?? "#888";
              const campRgb = branchColorRgb[campaign.branch] ?? "136,136,136";
              return (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card
                    padding="sm"
                    className={`${branchIdentityClass[campaign.branch] ?? ""} branch-card hover-lift space-y-3 cursor-pointer`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{
                            background: `rgba(${campRgb}, 0.15)`,
                            border: `1px solid rgba(${campRgb}, 0.3)`,
                          }}
                        >
                          <BranchIcon branchKey={campaign.branch} className="w-5 h-5" style={{ color: campColor }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{campaign.title}</p>
                          <p className="text-xs text-text-muted">
                            День {campaign.currentDay ?? 1} из {campaign.durationDays}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: campColor }}>
                        {campaign.progress ?? 0}%
                      </span>
                    </div>
                    <ProgressBar progress={campaign.progress ?? 0} />
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── No branch, no active campaigns — prompt ── */}
      {!selectedBranch && !loading && activeCampaigns.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted font-medium tracking-wider uppercase">
              Кампании
            </p>
            <Link href="/campaigns" className="text-xs text-metallic font-medium hover:underline">
              Все кампании
            </Link>
          </div>
          <Card className="text-center py-8 space-y-3">
            <svg className="w-10 h-10 mx-auto text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7l9-4 9 4M4 7v10M20 7v10M8 11v6M12 11v6M16 11v6" />
            </svg>
            <p className="text-text-secondary text-sm">Начни первую кампанию</p>
            <p className="text-text-muted text-xs">
              Выбери ветку на карте или открой{" "}
              <Link href="/campaigns" className="text-metallic underline">все кампании</Link>
            </p>
          </Card>
        </div>
      )}

      {/* ── Selected branch → campaigns for that branch ── */}
      {selectedBranch && activeCfg && (
        <div className="space-y-4" style={{ animation: "onboarding-fade-in 0.4s ease-out" }}>
          {/* Branch header with back button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/learn")}
              className="w-8 h-8 rounded-lg bg-surface-light/50 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: activeDotHex }} />
              <h2 className="font-bold text-lg">{activeCfg.title}</h2>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CampaignSkeleton />
              <CampaignSkeleton />
            </div>
          )}

          {!loading && activeBranch && activeBranch.campaigns.length === 0 && (
            <Card className="text-center py-8 space-y-3">
              <BranchIcon branchKey={activeBranchKey} className="w-10 h-10 mx-auto" style={{ color: activeDotHex }} />
              <p className="text-text-secondary text-sm">Кампании скоро появятся</p>
              <p className="text-text-muted text-xs">Мы готовим материалы для этой ветки</p>
            </Card>
          )}

          {!loading && activeBranch && activeBranch.campaigns.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeBranch.campaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card
                    padding="sm"
                    className={`${activeIdentityClass} branch-card hover-lift space-y-3 cursor-pointer`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center branch-icon"
                        >
                          <BranchIcon branchKey={activeBranchKey} className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{campaign.title}</p>
                          <p className="text-xs text-text-muted">
                            {campaign.durationDays} дней
                            {campaign.started && ` · день ${campaign.currentDay ?? 1}`}
                          </p>
                        </div>
                      </div>
                      {campaign.started && (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: (campaign.progress ?? 0) === 100 ? activeDotHex : undefined }}
                        >
                          {campaign.progress ?? 0}%
                        </span>
                      )}
                      {!campaign.started && (
                        <span className="text-xs text-text-muted font-medium px-2 py-0.5 rounded-full bg-surface-light">
                          Новая
                        </span>
                      )}
                    </div>
                    {campaign.started && (campaign.progress ?? 0) > 0 && (campaign.progress ?? 0) < 100 && (
                      <ProgressBar progress={campaign.progress ?? 0} />
                    )}
                    {campaign.description && (
                      <p className="text-xs text-text-muted line-clamp-2">{campaign.description}</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Link to all campaigns for this branch */}
          {!loading && activeBranch && activeBranch.campaigns.length > 0 && (
            <div className="text-center pt-1">
              <Link
                href={`/campaigns?branch=${activeBranchKey}`}
                className="text-sm text-metallic font-medium hover:underline"
              >
                Все кампании: {activeCfg.title} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
