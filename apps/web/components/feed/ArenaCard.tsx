"use client";

import { useCallback } from "react";
import { getBranch } from "@/lib/branches";

/* ─── difficulty labels ─── */
const DIFFICULTY_LABELS: Record<string, { label: string; colorClass: string }> = {
  bronze:   { label: "БРОНЗА",   colorClass: "text-amber-600"    },
  silver:   { label: "СЕРЕБРО",  colorClass: "text-gray-300"     },
  gold:     { label: "ЗОЛОТО",   colorClass: "text-yellow-400"   },
  platinum: { label: "ПЛАТИНА",  colorClass: "text-cyan-200"     },
};

/* ─── types ─── */
interface ArenaCardProps {
  data: {
    message: string;
    branch: string;
    conceptsLearned: number;
    suggestedDifficulty: string;
  };
  onArenaClick?: () => void;
}

/* ─── component ─── */
export default function ArenaCard({ data, onArenaClick }: ArenaCardProps) {
  const bc = getBranch(data.branch);
  const diff = DIFFICULTY_LABELS[data.suggestedDifficulty.toLowerCase()] ?? { label: "СЕРЕБРО", colorClass: "text-gray-300" };

  const handleClick = useCallback(() => {
    onArenaClick?.();
  }, [onArenaClick]);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col px-4 py-6 overflow-hidden">
      {/* ── Background effects ── */}
      {/* radial arena glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          background: `radial-gradient(ellipse at 50% 70%, ${bc.color} 0%, transparent 60%)`,
        }}
      />
      {/* colosseum-like radial pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background: `repeating-radial-gradient(circle at 50% 80%, transparent 0px, transparent 40px, ${bc.color} 41px, transparent 42px)`,
        }}
      />
      {/* pulsing glow border */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse"
        style={{
          boxShadow: `inset 0 0 40px rgba(${bc.rgb}, 0.06), inset 0 0 80px rgba(${bc.rgb}, 0.03)`,
        }}
      />

      {/* ── Badge ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-6">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border"
          style={{
            borderColor: `${bc.color}44`,
            backgroundColor: `${bc.color}12`,
            color: bc.color,
          }}
        >
          {/* colosseum icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16" />
            <path d="M4 12V8a8 8 0 0116 0v4" />
            <path d="M6 12v6" />
            <path d="M10 12v6" />
            <path d="M14 12v6" />
            <path d="M18 12v6" />
            <path d="M3 18h18" />
            <path d="M2 22h20" />
          </svg>
          АРЕНА
        </span>

        {/* difficulty badge */}
        <span
          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] ${diff.colorClass}`}
        >
          {diff.label}
        </span>
      </div>

      {/* ── Main content — vertically centered ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center gap-8">
        {/* shield/sword icon */}
        <div className="relative">
          {/* glow behind icon */}
          <div
            className="absolute inset-0 blur-2xl opacity-30 scale-150"
            style={{ backgroundColor: bc.color }}
          />
          <svg
            className="relative w-16 h-16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={bc.color}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* shield */}
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            {/* sword cross */}
            <path d="M12 8v5" strokeWidth={1.8} />
            <path d="M10 11h4" strokeWidth={1.8} />
            <path d="M12 13v3" strokeWidth={1.2} />
          </svg>
        </div>

        {/* message */}
        <p className="text-base text-text-secondary leading-relaxed max-w-xs">
          {data.message}
        </p>

        {/* CTA button */}
        <div className="relative">
          {/* animated spark particles */}
          <style jsx>{`
            @keyframes spark-a { 0% { opacity:0; transform: translate(0,0) scale(0); } 30% { opacity:1; } 100% { opacity:0; transform: translate(-30px,-40px) scale(1); } }
            @keyframes spark-b { 0% { opacity:0; transform: translate(0,0) scale(0); } 30% { opacity:1; } 100% { opacity:0; transform: translate(35px,-35px) scale(1); } }
            @keyframes spark-c { 0% { opacity:0; transform: translate(0,0) scale(0); } 30% { opacity:1; } 100% { opacity:0; transform: translate(-25px,30px) scale(1); } }
            @keyframes spark-d { 0% { opacity:0; transform: translate(0,0) scale(0); } 30% { opacity:1; } 100% { opacity:0; transform: translate(30px,25px) scale(1); } }
            .spark-a { position:absolute; width:3px; height:3px; border-radius:9999px; top:50%; left:15%; animation: spark-a 2.4s ease-out infinite; pointer-events:none; }
            .spark-b { position:absolute; width:2px; height:2px; border-radius:9999px; top:40%; right:15%; animation: spark-b 2.8s ease-out 0.4s infinite; pointer-events:none; }
            .spark-c { position:absolute; width:2.5px; height:2.5px; border-radius:9999px; bottom:30%; left:10%; animation: spark-c 3.0s ease-out 0.8s infinite; pointer-events:none; }
            .spark-d { position:absolute; width:2px; height:2px; border-radius:9999px; bottom:35%; right:10%; animation: spark-d 2.6s ease-out 1.2s infinite; pointer-events:none; }
          `}</style>

          <div className="spark-a" style={{ backgroundColor: bc.color }} />
          <div className="spark-b" style={{ backgroundColor: bc.color }} />
          <div className="spark-c" style={{ backgroundColor: bc.color }} />
          <div className="spark-d" style={{ backgroundColor: bc.color }} />

          {/* pulsing glow ring */}
          <div
            className="absolute inset-0 rounded-2xl opacity-40 animate-pulse blur-md"
            style={{ boxShadow: `0 0 30px rgba(${bc.rgb}, 0.4), 0 0 60px rgba(${bc.rgb}, 0.15)` }}
          />

          <button
            onClick={handleClick}
            className="
              relative z-10 px-10 py-4 rounded-2xl font-black text-base uppercase tracking-wider
              transition-all duration-200 active:scale-95
              text-white border border-white/10
              hover:-translate-y-0.5
            "
            style={{
              backgroundColor: `rgba(${bc.rgb}, 0.2)`,
              boxShadow: `0 0 20px rgba(${bc.rgb}, 0.3), 0 0 60px rgba(${bc.rgb}, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)`,
              textShadow: `0 0 20px rgba(${bc.rgb}, 0.5)`,
            }}
          >
            <span className="flex items-center gap-2.5">
              {/* sword icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6" />
                <path d="M16 16l4 4" />
                <path d="M19 21l2-2" />
              </svg>
              НАЙТИ ПРОТИВНИКА
            </span>
          </button>
        </div>

        {/* difficulty suggestion */}
        <p className="text-xs text-text-muted">
          Рекомендуемая сложность:{" "}
          <span className={`font-semibold ${diff.colorClass}`}>{diff.label}</span>
        </p>
      </div>

      {/* ── Swipe hint ── */}
      <div className="relative z-10 flex justify-center pt-6">
        <div className="flex flex-col items-center gap-1 text-text-muted opacity-40 animate-bounce">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
          <span className="text-[10px] uppercase tracking-widest">Свайпни вверх</span>
        </div>
      </div>
    </div>
  );
}
