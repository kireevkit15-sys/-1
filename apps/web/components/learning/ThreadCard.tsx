/**
 * F22.8 — ThreadCard
 * "Нить": три точки (вчера -> сегодня -> завтра) с подписями.
 * Визуальная связь тем: горизонтальная линия на sm+, вертикальная на узких
 * экранах. Центральная точка "сегодня" крупнее, с медным свечением.
 */

interface ThreadNode {
  title: string;
  subtitle?: string;
}

interface ThreadCardProps {
  yesterday: ThreadNode;
  today: ThreadNode;
  tomorrow: ThreadNode;
}

type Position = "past" | "present" | "future";

const LABELS: Record<Position, string> = {
  past: "Вчера",
  present: "Сегодня",
  future: "Завтра",
};

function Node({
  node,
  position,
}: {
  node: ThreadNode;
  position: Position;
}) {
  const isPresent = position === "present";
  return (
    <div
      className={`relative flex sm:flex-col items-center sm:items-center gap-4 sm:gap-5 ${
        isPresent ? "" : "opacity-60"
      }`}
    >
      {/* dot */}
      <div className="relative flex items-center justify-center shrink-0">
        {isPresent ? (
          <span
            aria-hidden
            className="absolute inline-block w-6 h-6 rounded-full bg-accent/10 blur-md"
          />
        ) : null}
        <span
          aria-hidden
          className={
            isPresent
              ? "relative block w-4 h-4 rounded-full bg-accent border border-accent shadow-neon-accent"
              : "relative block w-2.5 h-2.5 rounded-full bg-transparent border border-border"
          }
        />
      </div>

      {/* labels */}
      <div className="flex-1 sm:flex-none text-left sm:text-center min-w-0">
        <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-secondary opacity-60 mb-1.5">
          {LABELS[position]}
        </div>
        <div
          className={`font-ritual text-sm leading-snug ${
            isPresent ? "text-text-primary" : "text-text-primary/80"
          }`}
        >
          {node.title}
        </div>
        {node.subtitle ? (
          <div className="font-verse italic text-xs text-text-secondary opacity-70 mt-1 leading-snug">
            {node.subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ThreadCard({ yesterday, today, tomorrow }: ThreadCardProps) {
  return (
    <section
      aria-label="Нить"
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto max-w-3xl">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-start gap-8 sm:gap-6">
          {/* connecting line — vertical on mobile, horizontal on sm+ */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[7px] top-2 bottom-2 w-px bg-border sm:left-[8%] sm:right-[8%] sm:top-[7px] sm:bottom-auto sm:w-auto sm:h-px"
          />

          <div className="relative sm:flex-1">
            <Node node={yesterday} position="past" />
          </div>
          <div className="relative sm:flex-1 sm:-mt-1">
            <Node node={today} position="present" />
          </div>
          <div className="relative sm:flex-1">
            <Node node={tomorrow} position="future" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default ThreadCard;
