"use client";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-light/60 ${className}`}
    />
  );
}

// Визуальная оболочка согласована с Card — одинаковый радиус и граница,
// чтобы skeleton не «дёргался» при замене на настоящую Card.
const CARD_SHELL = "rounded-2xl bg-surface/80 border border-white/[0.05]";

/** Card-shaped skeleton for lists */
export function SkeletonCard() {
  return (
    <div className={`${CARD_SHELL} p-4 space-y-3`}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
    </div>
  );
}

/** Stats grid skeleton (4 cards) */
export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`${CARD_SHELL} p-3 space-y-2`}>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
