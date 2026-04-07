// ─────────────────────────────────────────────
//  РАЗУМ — Production Seed (500+ вопросов + модули)
// ─────────────────────────────────────────────
//
//  Запуск: npx tsx prisma/seed-production.ts
//  Или:    pnpm db:seed:production
//
//  Загружает:
//    - 56 базовых вопросов (хардкод)
//    - 200+ сгенерированных вопросов из scripts/output/
//    - 17 модулей обучения (10 базовых + 7 из генерации)
//    - 14 достижений
//    - Ежедневные факты
//    - Админ-пользователя
//
//  Идемпотентный — безопасно запускать повторно.
//  Дедупликация по детерминистическому UUID из текста вопроса.
// ─────────────────────────────────────────────

import { PrismaClient, Branch, Difficulty, Role } from "@prisma/client";
import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { SEED_FACTS } from "../apps/api/src/facts/facts.seed";

const prisma = new PrismaClient();

// ── Детерминистический UUID из текста ────────────────────────
// Гарантирует: один и тот же вопрос = один и тот же ID при каждом запуске

function textToUuid(text: string): string {
  const hash = createHash("sha256").update(text).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16), // UUID v4 format
    "8" + hash.slice(17, 20), // variant bits
    hash.slice(20, 32),
  ].join("-");
}

// ── Интерфейс вопроса ───────────────────────────────────────

interface QuestionData {
  id: string;
  category: string;
  branch: Branch;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  statPrimary: string;
  statSecondary: string | null;
}

// ── Загрузка вопросов из JSON-файлов ────────────────────────

function loadGeneratedQuestions(): QuestionData[] {
  const outputDir = join(__dirname, "..", "scripts", "output");
  let files: string[];
  try {
    files = readdirSync(outputDir).filter((f) => f.startsWith("questions-") && f.endsWith(".json"));
  } catch {
    console.log("  Нет директории scripts/output — пропускаем JSON-вопросы");
    return [];
  }

  const loaded: QuestionData[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(join(outputDir, file), "utf-8");
      const parsed = JSON.parse(content) as Array<{
        category: string;
        branch: string;
        difficulty: string;
        text: string;
        options: string[];
        correctIndex: number;
        explanation: string;
        statPrimary: string;
        statSecondary?: string;
      }>;
      for (const q of parsed) {
        loaded.push({
          id: textToUuid(q.text),
          category: q.category,
          branch: q.branch as Branch,
          difficulty: q.difficulty as Difficulty,
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          statPrimary: q.statPrimary,
          statSecondary: q.statSecondary ?? null,
        });
      }
      console.log(`  ✓ ${file}: ${parsed.length} вопросов`);
    } catch (e) {
      console.warn(`  ✗ ${file}: ${e}`);
    }
  }
  return loaded;
}

// ── Базовые вопросы (56 шт.) ────────────────────────────────
// Импортируем из основного seed — они же нужны для модулей

function getBaseQuestions(): QuestionData[] {
  // Вместо дублирования всех 56 вопросов — загружаем из seed.ts runtime
  // Но seed.ts выполняет main() при импорте, поэтому хардкодим inline
  // Базовые вопросы уже в БД через pnpm db:seed — здесь только генерация
  return [];
}

// ── Описания модулей для сгенерированных категорий ──────────

const GENERATED_MODULES: Array<{
  category: string;
  branch: Branch;
  title: string;
  description: string;
  orderIndex: number;
}> = [
  {
    category: "Эмоциональный интеллект",
    branch: "STRATEGY",
    title: "Эмоциональный интеллект",
    description:
      "Распознавание эмоций, эмпатия и саморегуляция: научитесь управлять эмоциями вместо того, чтобы они управляли вами.",
    orderIndex: 6,
  },
  {
    category: "Финансовая грамотность",
    branch: "STRATEGY",
    title: "Финансовая грамотность",
    description:
      "Инвестиции, сложный процент, диверсификация: основы финансового мышления для осознанных решений.",
    orderIndex: 7,
  },
  {
    category: "Здоровье и энергия",
    branch: "STRATEGY",
    title: "Здоровье и энергия",
    description:
      "Сон, питание, восстановление: стратегический подход к физическому ресурсу как фундаменту продуктивности.",
    orderIndex: 8,
  },
  {
    category: "Управление временем",
    branch: "STRATEGY",
    title: "Управление временем",
    description:
      "Матрица Эйзенхауэра, закон Паркинсона, deep work: освойте инструменты, которые превращают время в результат.",
    orderIndex: 9,
  },
  {
    category: "Лидерство",
    branch: "LOGIC",
    title: "Лидерство",
    description:
      "Мотивация команды, делегирование, обратная связь: логика принятия решений, когда на кону не только ваш результат.",
    orderIndex: 6,
  },
  {
    category: "Переговоры и коммуникация",
    branch: "LOGIC",
    title: "Переговоры и коммуникация",
    description:
      "BATNA, активное слушание, фрейминг: системный подход к переговорам и убедительной коммуникации.",
    orderIndex: 7,
  },
  {
    category: "Отношения",
    branch: "LOGIC",
    title: "Отношения",
    description:
      "Теория привязанности, границы, конфликтология: логика построения здоровых и устойчивых отношений.",
    orderIndex: 8,
  },
];

// ── Достижения ──────────────────────────────────────────────

const ACHIEVEMENTS = [
  { code: "first_blood", name: "Первая кровь", description: "Выиграй свой первый баттл", icon: "swords", category: "BATTLE" as const, condition: { type: "wins", threshold: 1 }, xpReward: 50 },
  { code: "warrior_10", name: "Воин", description: "Одержи 10 побед в баттлах", icon: "shield", category: "BATTLE" as const, condition: { type: "wins", threshold: 10 }, xpReward: 150 },
  { code: "gladiator_50", name: "Гладиатор", description: "Одержи 50 побед в баттлах", icon: "crown", category: "BATTLE" as const, condition: { type: "wins", threshold: 50 }, xpReward: 500 },
  { code: "veteran_100", name: "Ветеран арены", description: "Проведи 100 баттлов", icon: "trophy", category: "BATTLE" as const, condition: { type: "battles", threshold: 100 }, xpReward: 300 },
  { code: "curious_mind", name: "Любопытный ум", description: "Ответь на 50 вопросов", icon: "brain", category: "LEARNING" as const, condition: { type: "questions_answered", threshold: 50 }, xpReward: 100 },
  { code: "scholar", name: "Учёный", description: "Ответь на 500 вопросов", icon: "book", category: "LEARNING" as const, condition: { type: "questions_answered", threshold: 500 }, xpReward: 400 },
  { code: "first_module", name: "Первый шаг", description: "Пройди первый модуль обучения", icon: "graduation", category: "LEARNING" as const, condition: { type: "modules_completed", threshold: 1 }, xpReward: 75 },
  { code: "master_learner", name: "Мастер знаний", description: "Пройди 10 модулей обучения", icon: "star", category: "LEARNING" as const, condition: { type: "modules_completed", threshold: 10 }, xpReward: 350 },
  { code: "streak_3", name: "Разгон", description: "Поддерживай серию 3 дня подряд", icon: "fire", category: "STREAK" as const, condition: { type: "streak", threshold: 3 }, xpReward: 50 },
  { code: "streak_7", name: "Неделя дисциплины", description: "Поддерживай серию 7 дней подряд", icon: "flame", category: "STREAK" as const, condition: { type: "streak", threshold: 7 }, xpReward: 150 },
  { code: "streak_30", name: "Железная воля", description: "Поддерживай серию 30 дней подряд", icon: "diamond", category: "STREAK" as const, condition: { type: "streak", threshold: 30 }, xpReward: 500 },
  { code: "first_pvp", name: "Дуэлянт", description: "Проведи первый баттл с реальным игроком", icon: "users", category: "SOCIAL" as const, condition: { type: "pvp_battles", threshold: 1 }, xpReward: 100 },
  { code: "level_5", name: "Восходящая звезда", description: "Достигни 5 уровня", icon: "rocket", category: "LEARNING" as const, condition: { type: "level", threshold: 5 }, xpReward: 200 },
  { code: "level_10", name: "Мудрец", description: "Достигни 10 уровня", icon: "compass", category: "LEARNING" as const, condition: { type: "level", threshold: 10 }, xpReward: 500 },
];

// ── MAIN ────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  РАЗУМ — Production Seed");
  console.log("═══════════════════════════════════════════════\n");

  // 1. Админ
  console.log("1. Админ-пользователь...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@razum.app" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@razum.app",
      role: Role.ADMIN,
      stats: { create: {} },
    },
  });
  console.log(`   ✓ Admin: ${admin.id}\n`);

  // 2. Загрузка сгенерированных вопросов
  console.log("2. Загрузка вопросов из scripts/output/...");
  const generated = loadGeneratedQuestions();

  // Дедупликация по тексту
  const seen = new Set<string>();
  const uniqueQuestions: QuestionData[] = [];
  for (const q of generated) {
    if (!seen.has(q.text)) {
      seen.add(q.text);
      uniqueQuestions.push(q);
    }
  }
  console.log(`   Всего загружено: ${generated.length}`);
  console.log(`   После дедупликации: ${uniqueQuestions.length}\n`);

  // 3. Bulk-вставка вопросов
  console.log("3. Вставка вопросов в БД...");
  const existingCount = await prisma.question.count();
  console.log(`   В БД уже есть: ${existingCount} вопросов`);

  // createMany с skipDuplicates по id (детерминистический UUID)
  const result = await prisma.question.createMany({
    data: uniqueQuestions.map((q) => ({
      id: q.id,
      category: q.category,
      branch: q.branch,
      difficulty: q.difficulty,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      statPrimary: q.statPrimary,
      statSecondary: q.statSecondary,
    })),
    skipDuplicates: true,
  });
  console.log(`   ✓ Добавлено новых: ${result.count}`);

  const totalQuestions = await prisma.question.count();
  console.log(`   Итого в БД: ${totalQuestions} вопросов\n`);

  // 4. Модули из сгенерированных категорий
  console.log("4. Создание модулей из сгенерированных категорий...");

  // Группируем вопросы по категории
  const questionsByCategory = new Map<string, QuestionData[]>();
  for (const q of uniqueQuestions) {
    const existing = questionsByCategory.get(q.category) || [];
    existing.push(q);
    questionsByCategory.set(q.category, existing);
  }

  let modulesCreated = 0;
  for (const mod of GENERATED_MODULES) {
    const categoryQuestions = questionsByCategory.get(mod.category);
    if (!categoryQuestions || categoryQuestions.length === 0) {
      console.log(`   ⊘ ${mod.title}: нет вопросов — пропускаем`);
      continue;
    }

    const questionIds = categoryQuestions.map((q) => q.id);

    await prisma.module.upsert({
      where: {
        branch_orderIndex: {
          branch: mod.branch,
          orderIndex: mod.orderIndex,
        },
      },
      update: {
        title: mod.title,
        description: mod.description,
        questionIds,
      },
      create: {
        branch: mod.branch,
        orderIndex: mod.orderIndex,
        title: mod.title,
        description: mod.description,
        questionIds,
      },
    });
    console.log(`   ✓ ${mod.title} (${mod.branch}): ${questionIds.length} вопросов`);
    modulesCreated++;
  }

  const totalModules = await prisma.module.count();
  console.log(`   Создано/обновлено: ${modulesCreated}, всего в БД: ${totalModules}\n`);

  // 5. Достижения
  console.log("5. Достижения...");
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: { name: a.name, description: a.description, icon: a.icon, category: a.category, condition: a.condition, xpReward: a.xpReward },
      create: a,
    });
  }
  console.log(`   ✓ ${ACHIEVEMENTS.length} достижений\n`);

  // 6. Ежедневные факты
  console.log("6. Ежедневные факты...");
  let factsAdded = 0;
  for (const f of SEED_FACTS) {
    const exists = await prisma.dailyFact.findFirst({ where: { text: f.text } });
    if (!exists) {
      await prisma.dailyFact.create({
        data: { text: f.text, source: f.source, branch: f.branch as Branch, category: f.category },
      });
      factsAdded++;
    }
  }
  console.log(`   ✓ Добавлено: ${factsAdded}, всего доступно: ${SEED_FACTS.length}\n`);

  // 7. Статистика
  console.log("═══════════════════════════════════════════════");
  console.log("  ИТОГО:");
  console.log(`    Вопросов в БД:    ${totalQuestions}`);
  console.log(`    Модулей в БД:     ${totalModules}`);
  console.log(`    Достижений:       ${ACHIEVEMENTS.length}`);
  console.log(`    Фактов:           ${SEED_FACTS.length}`);

  // Разбивка по категориям
  const stats = await prisma.question.groupBy({
    by: ["branch", "difficulty"],
    _count: true,
    where: { isActive: true },
  });
  console.log("\n  Вопросы по branch + difficulty:");
  for (const s of stats) {
    console.log(`    ${s.branch} / ${s.difficulty}: ${s._count}`);
  }

  const catStats = await prisma.question.groupBy({
    by: ["category"],
    _count: true,
    where: { isActive: true },
    orderBy: { _count: { category: "desc" } },
  });
  console.log("\n  Вопросы по категориям:");
  for (const s of catStats) {
    console.log(`    ${s.category}: ${s._count}`);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Production seed завершён!");
  console.log("═══════════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("ОШИБКА:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
