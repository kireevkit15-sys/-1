/**
 * F22.8 — ThreadCard «Нить».
 * Путь солнца: вчера = рассвет, сегодня = зенит, завтра = закат.
 * Настоящее — живое солнце в центре с лучами и пульсом.
 * Прошлое и будущее — тусклые точки на горизонте, один с розовым,
 * другой с синим отливом (закат/рассвет).
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

export function ThreadCard({ yesterday, today, tomorrow }: ThreadCardProps) {
  return (
    <section
      aria-label="Нить времени"
      className="relative w-full px-6 sm:px-10 py-14 sm:py-20 overflow-hidden"
    >
      {/* Огромное солнечное свечение позади — основа атмосферы */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[420px] animate-breathe"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(207,157,123,0.28) 0%, rgba(185,141,52,0.12) 25%, rgba(114,75,57,0.06) 50%, transparent 75%)",
        }}
      />

      {/* Линия горизонта — тонкий градиент от рассвета через солнце к закату */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-[48%] h-px"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(137,53,42,0.4) 12%, rgba(185,141,52,0.55) 30%, rgba(232,221,211,0.7) 50%, rgba(185,141,52,0.55) 70%, rgba(114,75,57,0.4) 88%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <div className="grid grid-cols-3 gap-4 sm:gap-8 items-center">
          {/* Вчера — рассвет */}
          <PastNode node={yesterday} />

          {/* Сегодня — солнце в зените */}
          <PresentSun node={today} />

          {/* Завтра — закат */}
          <FutureNode node={tomorrow} />
        </div>
      </div>
    </section>
  );
}

// ── Вчера: холодная дальняя точка (рассветный пепел) ─────────────────
function PastNode({ node }: { node: ThreadNode }) {
  return (
    <div className="flex flex-col items-center text-center opacity-70">
      <div className="relative mb-5 sm:mb-6" aria-hidden>
        <span
          className="block w-3 h-3 rounded-full"
          style={{
            background: "rgba(137,53,42,0.55)",
            boxShadow: "0 0 10px rgba(137,53,42,0.4)",
          }}
        />
      </div>
      <div className="font-ritual text-[9px] sm:text-[10px] tracking-[0.4em] uppercase text-text-muted mb-2">
        Вчера
      </div>
      <div className="font-ritual text-xs sm:text-sm tracking-[0.1em] text-text-secondary leading-snug">
        {node.title}
      </div>
      {node.subtitle && (
        <div className="font-verse italic text-[11px] sm:text-xs text-text-muted mt-1 leading-snug">
          {node.subtitle}
        </div>
      )}
    </div>
  );
}

// ── Сегодня: солнце с лучами ─────────────────────────────────────────
function PresentSun({ node }: { node: ThreadNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-7 sm:mb-9" aria-hidden>
        {/* Дальнее свечение */}
        <span
          className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full blur-2xl animate-breathe"
          style={{
            background:
              "radial-gradient(circle, rgba(207,157,123,0.7) 0%, rgba(207,157,123,0.2) 40%, transparent 70%)",
          }}
        />
        {/* Лучи — 8 штук вокруг солнца */}
        <SunRays />
        {/* Само солнце */}
        <span
          className="relative block w-8 h-8 sm:w-10 sm:h-10 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #F5DDC1 0%, #CF9D7B 40%, #B98D34 80%, #724B39 100%)",
            boxShadow:
              "0 0 24px rgba(207,157,123,0.8), 0 0 48px rgba(207,157,123,0.4), inset 0 0 8px rgba(255,255,255,0.2)",
          }}
        />
      </div>
      <div className="font-ritual text-[10px] sm:text-xs tracking-[0.4em] uppercase text-accent mb-3">
        Сегодня
      </div>
      <div className="font-ritual text-base sm:text-lg tracking-[0.08em] text-text-primary leading-snug">
        {node.title}
      </div>
      {node.subtitle && (
        <div className="font-verse italic text-xs sm:text-sm text-accent/70 mt-2 leading-snug">
          {node.subtitle}
        </div>
      )}
    </div>
  );
}

// ── Завтра: холодная дальняя точка (предзакатное золото) ─────────────
function FutureNode({ node }: { node: ThreadNode }) {
  return (
    <div className="flex flex-col items-center text-center opacity-70">
      <div className="relative mb-5 sm:mb-6" aria-hidden>
        <span
          className="block w-3 h-3 rounded-full"
          style={{
            background: "rgba(185,141,52,0.55)",
            boxShadow: "0 0 10px rgba(185,141,52,0.4)",
          }}
        />
      </div>
      <div className="font-ritual text-[9px] sm:text-[10px] tracking-[0.4em] uppercase text-text-muted mb-2">
        Завтра
      </div>
      <div className="font-ritual text-xs sm:text-sm tracking-[0.1em] text-text-secondary leading-snug">
        {node.title}
      </div>
      {node.subtitle && (
        <div className="font-verse italic text-[11px] sm:text-xs text-text-muted mt-1 leading-snug">
          {node.subtitle}
        </div>
      )}
    </div>
  );
}

// ── 8 лучей вокруг солнца ────────────────────────────────────────────
function SunRays() {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div
      aria-hidden
      className="absolute inset-0 w-8 h-8 sm:w-10 sm:h-10 pointer-events-none"
    >
      {rays.map((deg, i) => (
        <span
          key={deg}
          className="absolute left-1/2 top-1/2 w-0.5 h-4 sm:h-5 -translate-x-1/2 origin-center"
          style={{
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-14px)`,
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(207,157,123,0.7) 50%, transparent 100%)",
            animation: `breathe ${8 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default ThreadCard;
