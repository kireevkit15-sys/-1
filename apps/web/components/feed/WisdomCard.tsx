"use client";

import { useEffect, useRef } from "react";

/* ─── branch utilities ─── */
const BRANCH_COLORS: Record<string, { color: string; rgb: string }> = {
  STRATEGY:  { color: "#06B6D4", rgb: "6,182,212"   },
  LOGIC:     { color: "#22C55E", rgb: "34,197,94"   },
  ERUDITION: { color: "#A855F7", rgb: "168,85,247"  },
  RHETORIC:  { color: "#F97316", rgb: "249,115,22"  },
  INTUITION: { color: "#EC4899", rgb: "236,72,153"  },
};

const DEFAULT_BRANCH = { color: "#06B6D4", rgb: "6,182,212" } as const;

const branchFor = (b?: string | null): { color: string; rgb: string } =>
  BRANCH_COLORS[(b ?? "STRATEGY").toUpperCase()] ?? DEFAULT_BRANCH;

/* ─── types ─── */
interface WisdomCardProps {
  data: {
    quote: string;
    author: string;
    authorTitle?: string;
    context: string;
  };
  branch: string;
}

/* ─── component ─── */
export default function WisdomCard({ data, branch }: WisdomCardProps) {
  const bc = branchFor(branch);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={cardRef} className="relative min-h-[calc(100vh-8rem)] flex flex-col px-4 py-6">
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${bc.color} 0%, transparent 70%)`,
        }}
      />

      {/* side glow lines */}
      <div
        className="absolute left-0 top-1/4 bottom-1/4 w-px opacity-30"
        style={{ background: `linear-gradient(to bottom, transparent, ${bc.color}40, transparent)` }}
      />
      <div
        className="absolute right-0 top-1/4 bottom-1/4 w-px opacity-30"
        style={{ background: `linear-gradient(to bottom, transparent, ${bc.color}40, transparent)` }}
      />

      {/* ── Badge ── */}
      <div className="relative z-10 flex items-center mb-8">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border"
          style={{
            borderColor: `${bc.color}33`,
            backgroundColor: `${bc.color}08`,
            color: bc.color,
          }}
        >
          {/* scroll icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          МУДРОСТЬ
        </span>
      </div>

      {/* ── Quote section — vertically centered ── */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-2">
        {/* decorative opening quote mark */}
        <span
          className="text-7xl font-serif leading-none select-none mb-2 opacity-20"
          style={{ color: bc.color }}
          aria-hidden="true"
        >
          &laquo;
        </span>

        {/* quote text */}
        <blockquote className="text-xl sm:text-2xl italic text-text-primary leading-relaxed font-light tracking-wide max-w-md">
          {data.quote}
        </blockquote>

        {/* decorative closing quote mark */}
        <span
          className="text-7xl font-serif leading-none select-none mt-2 opacity-20"
          style={{ color: bc.color }}
          aria-hidden="true"
        >
          &raquo;
        </span>

        {/* ── Author ── */}
        <div className="flex items-center gap-3 mt-8">
          <div className="w-px h-8 opacity-30" style={{ backgroundColor: bc.color }} />
          <div className="text-left">
            <p className="text-sm font-bold text-text-primary">{data.author}</p>
            {data.authorTitle && (
              <p className="text-xs text-text-muted mt-0.5">{data.authorTitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Context ── */}
      <div className="relative z-10 mt-8">
        {/* subtle branch-colored gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-32 pointer-events-none opacity-[0.04]"
          style={{
            background: `linear-gradient(to top, ${bc.color}, transparent)`,
          }}
        />

        <div className="pt-4 border-t border-white/[0.04]">
          <p className="text-sm text-text-secondary leading-relaxed text-center">
            {data.context}
          </p>
        </div>
      </div>
    </div>
  );
}
