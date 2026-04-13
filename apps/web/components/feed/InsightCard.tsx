"use client";

import { useEffect, useRef, useMemo } from "react";

// ─── Branch config ──────────────────────────────────────────────

type BranchKey = "STRATEGY" | "LOGIC" | "ERUDITION" | "RHETORIC" | "INTUITION";

interface BranchMeta {
  label: string;
  color: string;
  iconPath: string;
}

const BRANCHES: Record<BranchKey, BranchMeta> = {
  STRATEGY: {
    label: "Стратегия",
    color: "#06B6D4",
    iconPath:
      "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  },
  LOGIC: {
    label: "Логика",
    color: "#22C55E",
    iconPath:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  ERUDITION: {
    label: "Эрудиция",
    color: "#A855F7",
    iconPath:
      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  RHETORIC: {
    label: "Риторика",
    color: "#F97316",
    iconPath:
      "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  INTUITION: {
    label: "Интуиция",
    color: "#EC4899",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
};

// ─── Props ──────────────────────────────────────────────────────

interface InsightCardProps {
  data: {
    title: string;
    body: string;
    example: string;
    source?: string;
    imageUrl?: string;
  };
  branch: string;
  onViewed?: () => void;
}

// ─── Component ──────────────────────────────────────────────────

export default function InsightCard({
  data,
  branch,
  onViewed,
}: InsightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const branchKey = branch.toUpperCase() as BranchKey;
  const meta = BRANCHES[branchKey] ?? BRANCHES.ERUDITION;

  // Intersection observer — fire onViewed when 60%+ visible
  useEffect(() => {
    if (!onViewed || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [onViewed]);

  // Split body into paragraphs
  const paragraphs = useMemo(
    () => data.body.split(/\n{2,}/).filter(Boolean),
    [data.body],
  );

  return (
    <div
      ref={cardRef}
      className="relative h-full flex flex-col rounded-2xl
                 bg-surface/80 backdrop-blur-sm border border-white/[0.05]
                 shadow-glass overflow-hidden"
    >
      {/* ── Top glow effect matching branch color ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.12] blur-2xl"
        style={{
          background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${meta.color}, transparent)`,
        }}
      />

      {/* Optional hero image */}
      {data.imageUrl && (
        <div className="relative h-44 w-full shrink-0 overflow-hidden">
          <img
            src={data.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/90" />
        </div>
      )}

      {/* Card content */}
      <div className="relative flex flex-1 flex-col px-5 pb-6 pt-5 gap-5">
        {/* ── Header row ── */}
        <div className="flex items-center justify-between">
          {/* Branch pill badge */}
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${meta.color}14` }}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke={meta.color}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={meta.iconPath} />
            </svg>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
          </div>

          {/* Card type badge */}
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${meta.color}0C` }}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke={meta.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: meta.color }}
            >
              Знание
            </span>
          </div>
        </div>

        {/* ── Title with metallic gradient ── */}
        <h2
          className="text-lg font-bold leading-snug tracking-tight
                     bg-metallic bg-clip-text text-transparent"
          style={{ fontSize: "clamp(1.125rem, 4.5vw, 1.375rem)" }}
        >
          {data.title}
        </h2>

        {/* ── Thin accent divider ── */}
        <div
          className="h-px w-12 rounded-full opacity-40"
          style={{ backgroundColor: meta.color }}
        />

        {/* ── Body paragraphs ── */}
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-sm leading-[1.7] text-text-secondary"
            >
              {p}
            </p>
          ))}
        </div>

        {/* ── Example callout ── */}
        <div className="relative rounded-xl overflow-hidden mt-1">
          {/* Glass background */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundColor: meta.color }}
          />
          <div className="absolute inset-0 bg-surface-light/80 backdrop-blur-sm" />

          {/* Left accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ backgroundColor: meta.color }}
          />

          {/* Subtle glow in top-left corner */}
          <div
            className="pointer-events-none absolute -left-px -top-px h-16 w-16 rounded-tl-xl opacity-20 blur-xl"
            style={{ backgroundColor: meta.color }}
          />

          <div className="relative px-4 py-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Пример
            </p>
            <p className="text-sm italic leading-[1.65] text-text-primary/90">
              {data.example}
            </p>
          </div>
        </div>

        {/* ── Source attribution ── */}
        {data.source && (
          <p className="text-[11px] italic text-text-muted">
            — {data.source}
          </p>
        )}

        {/* Spacer pushes swipe hint to bottom */}
        <div className="flex-1" />

        {/* ── Swipe hint ── */}
        <div className="flex flex-col items-center gap-1 pt-4 opacity-40">
          <svg
            className="h-4 w-4 animate-bounce text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-[10px] tracking-wide text-text-muted">
            Свайпни вверх
          </span>
        </div>
      </div>
    </div>
  );
}
