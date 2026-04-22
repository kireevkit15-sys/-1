"use client";

import { useMemo } from "react";
import { BRANCHES, type BranchKey } from "@/lib/branches";
import { BranchBadge } from "@/components/ui/BranchBadge";
import { FeedCardShell } from "@/components/ui/FeedCardShell";
import { SwipeHint } from "@/components/ui/SwipeHint";

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

function KnowledgeIcon({ color }: { color: string }) {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ExampleBulbIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

export default function InsightCard({
  data,
  branch,
  onViewed,
}: InsightCardProps) {
  const meta =
    BRANCHES[branch.toUpperCase() as BranchKey] ?? BRANCHES.ERUDITION;
  const paragraphs = useMemo(
    () => data.body.split(/\n{2,}/).filter(Boolean),
    [data.body],
  );

  return (
    <FeedCardShell
      branch={meta}
      glow="top-strip"
      onViewed={onViewed}
      beforeContent={
        data.imageUrl ? (
          <div className="relative h-44 w-full shrink-0 overflow-hidden">
            <img
              src={data.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/90" />
          </div>
        ) : null
      }
    >
      <div className="relative flex flex-1 flex-col px-5 pb-6 pt-5 gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BranchBadge branch={meta} size="sm" bgAlpha="14" />
          <BranchBadge
            branch={meta}
            label="Знание"
            icon={<KnowledgeIcon color={meta.color} />}
            size="xs"
            bgAlpha="0C"
          />
        </div>

        <h2
          className="text-lg font-bold leading-snug tracking-tight bg-metallic bg-clip-text text-transparent"
          style={{ fontSize: "clamp(1.125rem, 4.5vw, 1.375rem)" }}
        >
          {data.title}
        </h2>

        <div
          className="h-px w-12 rounded-full opacity-40"
          style={{ backgroundColor: meta.color }}
        />

        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-[1.7] text-text-secondary">
              {p}
            </p>
          ))}
        </div>

        <div className="relative rounded-xl overflow-hidden mt-1">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundColor: meta.color }}
          />
          <div className="absolute inset-0 bg-surface-light/80 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ backgroundColor: meta.color }}
          />
          <div
            className="pointer-events-none absolute -left-px -top-px h-16 w-16 rounded-tl-xl opacity-20 blur-xl"
            style={{ backgroundColor: meta.color }}
          />

          <div className="relative px-4 py-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              <ExampleBulbIcon />
              Пример
            </p>
            <p className="text-sm italic leading-[1.65] text-text-primary/90">
              {data.example}
            </p>
          </div>
        </div>

        {data.source && (
          <p className="text-[11px] italic text-text-muted">— {data.source}</p>
        )}

        <div className="flex-1" />

        <SwipeHint />
      </div>
    </FeedCardShell>
  );
}
