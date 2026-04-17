"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getBranch, type BranchMeta } from "@/lib/branches";

type GlowVariant = "top-strip" | "top-corner" | "center-radial" | "none";

interface FeedCardShellProps {
  branch?: string | BranchMeta;
  children: ReactNode;
  /** Тип ambient-свечения: полоса сверху, радиал из угла, центральный радиал, или без. */
  glow?: GlowVariant;
  /** Занимает высоту вьюпорта (feed swiper). По умолчанию — auto. */
  fullscreen?: boolean;
  /** Callback когда карточка 60%+ в зоне видимости (трекинг просмотра). */
  onViewed?: () => void;
  className?: string;
  /** Контент перед body — например hero-image без inner-padding. */
  beforeContent?: ReactNode;
}

export function FeedCardShell({
  branch,
  children,
  glow = "top-strip",
  fullscreen = false,
  onViewed,
  className = "",
  beforeContent,
}: FeedCardShellProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const resolved = branch
    ? typeof branch === "string"
      ? getBranch(branch)
      : branch
    : null;

  useEffect(() => {
    if (!onViewed || !innerRef.current) return;
    const el = innerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onViewed]);

  const sizeClass = fullscreen ? "min-h-[calc(100vh-8rem)]" : "h-full";

  return (
    <div
      ref={innerRef}
      className={`relative ${sizeClass} flex flex-col rounded-2xl bg-surface/80 backdrop-blur-sm border border-white/[0.05] shadow-glass overflow-hidden ${className}`}
    >
      {resolved && glow === "top-strip" && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-[0.12] blur-2xl"
          style={{
            background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${resolved.color}, transparent)`,
          }}
        />
      )}
      {resolved && glow === "top-corner" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${resolved.color} 0%, transparent 60%)`,
          }}
        />
      )}
      {resolved && glow === "center-radial" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            background: `radial-gradient(ellipse at 50% 60%, ${resolved.color} 0%, transparent 70%)`,
          }}
        />
      )}
      {beforeContent}
      {children}
    </div>
  );
}

export default FeedCardShell;
