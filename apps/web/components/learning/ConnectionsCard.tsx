/**
 * F23.7 — ConnectionsCard «Связи».
 * Паутина связанных концептов вокруг центрального. Каждый узел кликабельный.
 * Визуал: центральный концепт, вокруг него 4-6 связанных, с подписями-связями.
 * На мобайл — стек-список с иконкой «→».
 */

interface ConnectedConcept {
  id: string;
  nameRu: string;
  relation: string; // "развивает", "противоречит", "является основой"
}

interface ConnectionsCardProps {
  centralConcept: string;
  connections: ConnectedConcept[];
  onConceptClick?: (id: string) => void;
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="4" cy="4" r="2" />
      <circle cx="20" cy="4" r="2" />
      <circle cx="4" cy="20" r="2" />
      <circle cx="20" cy="20" r="2" />
      <path d="M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4" />
    </svg>
  );
}

export function ConnectionsCard({
  centralConcept,
  connections,
  onConceptClick,
}: ConnectionsCardProps) {
  return (
    <article
      aria-label={`Связи концепта: ${centralConcept}`}
      className="w-full px-6 sm:px-10 py-10 sm:py-14"
    >
      <div className="mx-auto" style={{ maxWidth: "64ch" }}>
        <div className="flex flex-col items-start gap-5 mb-8">
          <NetworkIcon className="text-branch-intuition" />
          <div>
            <div className="font-ritual text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2">
              Связи
            </div>
            <h2 className="font-ritual text-2xl sm:text-3xl tracking-[0.08em] text-text-primary leading-tight">
              {centralConcept}
            </h2>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-7 leading-relaxed">
          Нажми на любой концепт, чтобы перейти к нему.
        </p>

        <ul className="flex flex-col gap-2">
          {connections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onConceptClick?.(c.id)}
                className="group w-full text-left border border-border hover:border-branch-intuition rounded-xl px-4 sm:px-5 py-3.5 bg-surface/40 hover:bg-branch-intuition/5 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="font-ritual text-[9px] tracking-[0.3em] uppercase text-text-muted shrink-0 min-w-[90px]"
                  >
                    {c.relation}
                  </span>
                  <span className="flex-1 font-verse text-base sm:text-lg text-text-primary leading-snug">
                    {c.nameRu}
                  </span>
                  <span
                    aria-hidden
                    className="text-text-muted group-hover:text-branch-intuition transition-colors shrink-0"
                  >
                    →
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default ConnectionsCard;
