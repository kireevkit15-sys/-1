/**
 * F22.2 — HookCard
 * "Зацепка": крупный текст-цитата по центру, тонкие линии-разделители,
 * минимум декора, максимум воздуха.
 */

interface HookCardProps {
  text: string;
}

export function HookCard({ text }: HookCardProps) {
  return (
    <section
      aria-label="Зацепка"
      className="w-full flex flex-col items-center justify-center py-16 sm:py-24 px-6 sm:px-10"
    >
      <div className="w-16 h-px bg-border mb-10 sm:mb-14" aria-hidden />

      <p
        className="font-verse italic text-center text-text-primary leading-[1.35]"
        style={{
          fontSize: "clamp(1.75rem, 6vw, 3rem)",
          maxWidth: "42ch",
        }}
      >
        {text}
      </p>

      <div className="w-16 h-px bg-border mt-10 sm:mt-14" aria-hidden />
    </section>
  );
}

export default HookCard;
