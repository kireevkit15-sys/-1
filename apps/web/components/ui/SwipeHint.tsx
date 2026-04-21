interface SwipeHintProps {
  label?: string;
  direction?: "up" | "down";
  className?: string;
}

export function SwipeHint({
  label = "Свайпни вверх",
  direction = "up",
  className = "",
}: SwipeHintProps) {
  const arrowPath = direction === "up" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7";

  return (
    <div
      className={`flex flex-col items-center gap-1 pt-4 opacity-40 ${className}`}
    >
      <svg
        className="h-4 w-4 animate-bounce text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={arrowPath} />
      </svg>
      <span className="text-[10px] tracking-wide text-text-muted">{label}</span>
    </div>
  );
}

export default SwipeHint;
