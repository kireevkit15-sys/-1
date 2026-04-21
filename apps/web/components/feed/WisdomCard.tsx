"use client";

import { getBranch } from "@/lib/branches";
import { BranchBadge } from "@/components/ui/BranchBadge";

interface WisdomCardProps {
  data: {
    quote: string;
    author: string;
    authorTitle?: string;
    context: string;
  };
  branch: string;
}

function ScrollIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export default function WisdomCard({ data, branch }: WisdomCardProps) {
  const meta = getBranch(branch);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col px-4 py-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${meta.color} 0%, transparent 70%)`,
        }}
      />

      <div
        className="absolute left-0 top-1/4 bottom-1/4 w-px opacity-30"
        style={{ background: `linear-gradient(to bottom, transparent, ${meta.color}40, transparent)` }}
      />
      <div
        className="absolute right-0 top-1/4 bottom-1/4 w-px opacity-30"
        style={{ background: `linear-gradient(to bottom, transparent, ${meta.color}40, transparent)` }}
      />

      <div className="relative z-10 flex items-center mb-8">
        <BranchBadge
          branch={meta}
          label="МУДРОСТЬ"
          icon={<ScrollIcon className="w-3.5 h-3.5" />}
          bgAlpha="08"
          borderAlpha="33"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-2">
        <span
          className="text-7xl font-serif leading-none select-none mb-2 opacity-20"
          style={{ color: meta.color }}
          aria-hidden="true"
        >
          &laquo;
        </span>

        <blockquote className="text-xl sm:text-2xl italic text-text-primary leading-relaxed font-light tracking-wide max-w-md">
          {data.quote}
        </blockquote>

        <span
          className="text-7xl font-serif leading-none select-none mt-2 opacity-20"
          style={{ color: meta.color }}
          aria-hidden="true"
        >
          &raquo;
        </span>

        <div className="flex items-center gap-3 mt-8">
          <div
            className="w-px h-8 opacity-30"
            style={{ backgroundColor: meta.color }}
          />
          <div className="text-left">
            <p className="text-sm font-bold text-text-primary">{data.author}</p>
            {data.authorTitle && (
              <p className="text-xs text-text-muted mt-0.5">{data.authorTitle}</p>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8">
        <div
          className="absolute inset-x-0 bottom-0 h-32 pointer-events-none opacity-[0.04]"
          style={{
            background: `linear-gradient(to top, ${meta.color}, transparent)`,
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
