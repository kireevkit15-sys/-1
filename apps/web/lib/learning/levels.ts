/**
 * Централизованные метаданные уровней системы обучения.
 * Используется во всех учебных экранах (F20, F21, F22, F24, F27).
 */

export type LevelKey =
  | "SLEEPING"
  | "AWAKENING"
  | "OBSERVER"
  | "WARRIOR"
  | "STRATEGIST"
  | "MASTER";

export interface LevelMeta {
  key: LevelKey;
  name: string; // русское имя для UI
  index: number; // порядковый номер (1..6)
  roman: string; // римская цифра для подписи
}

export const LEVELS: LevelMeta[] = [
  { key: "SLEEPING", name: "Спящий", index: 1, roman: "I" },
  { key: "AWAKENING", name: "Пробуждённый", index: 2, roman: "II" },
  { key: "OBSERVER", name: "Наблюдатель", index: 3, roman: "III" },
  { key: "WARRIOR", name: "Воин", index: 4, roman: "IV" },
  { key: "STRATEGIST", name: "Стратег", index: 5, roman: "V" },
  { key: "MASTER", name: "Мастер", index: 6, roman: "VI" },
];

export const LEVEL_BY_KEY: Record<LevelKey, LevelMeta> = LEVELS.reduce(
  (acc, level) => {
    acc[level.key] = level;
    return acc;
  },
  {} as Record<LevelKey, LevelMeta>,
);

/** Безопасное получение имени уровня по ключу (с fallback). */
export function getLevelName(key: string | null | undefined): string {
  if (!key) return "Спящий";
  return LEVEL_BY_KEY[key as LevelKey]?.name ?? "Спящий";
}
