/**
 * F22.9 — WisdomLearningCard
 * "Мудрость": крупная курсивная цитата, имя автора внизу.
 * Завершающая атмосфера — тишина, воздух, тонкая медная линия над цитатой.
 */

interface WisdomLearningCardProps {
  quote: string;
  author: string;
}

export function WisdomLearningCard({ quote, author }: WisdomLearningCardProps) {
  return (
    <section
      aria-label="Мудрость"
      className="w-full flex flex-col items-center justify-center py-16 sm:py-24 px-6 sm:px-10"
    >
      {/* декоративная тонкая медная линия */}
      <div
        aria-hidden
        className="w-16 h-px bg-accent mb-10 sm:mb-14 opacity-80"
      />

      <p
        className="font-verse italic text-center text-text-primary leading-[1.35]"
        style={{
          fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
          maxWidth: "40ch",
        }}
      >
        {quote}
      </p>

      <div className="mt-12 sm:mt-16 font-ritual text-sm tracking-[0.35em] uppercase text-text-secondary opacity-70">
        <span aria-hidden>— </span>
        {author}
      </div>
    </section>
  );
}

export default WisdomLearningCard;
