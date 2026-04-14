import { PrismaClient, ConceptRelationType, DepthLayerType } from '@prisma/client';

const prisma = new PrismaClient();

// ── B24.2: Seed concept relations (prerequisites, related, deepens) ─────

interface RelationSeed {
  sourceSlug: string;
  targetSlug: string;
  relationType: ConceptRelationType;
  strength: number;
}

const CONCEPT_RELATIONS: RelationSeed[] = [
  // STRATEGY prerequisites chain
  { sourceSlug: 'remontnoe-povedenie-vmesto-sistemnogo-analiza', targetSlug: 'pereotsenka-aktualnogo-motiva', relationType: 'PREREQUISITE', strength: 0.8 },
  { sourceSlug: 'pereotsenka-aktualnogo-motiva', targetSlug: 'markaryan-mental-rehearsal', relationType: 'RELATED', strength: 0.6 },
  // LOGIC chain
  { sourceSlug: 'markaryan-critical-thinking-popularity', targetSlug: 'reduktivnye-gipotezy-i-tsentralnaya-peremennaya', relationType: 'PREREQUISITE', strength: 0.85 },
  { sourceSlug: 'lineynoe-myshlenie-v-kompleksnykh-sistemakh', targetSlug: 'nedootsenka-eksponentsialnykh-protsessov', relationType: 'PREREQUISITE', strength: 0.9 },
  { sourceSlug: 'reduktivnye-gipotezy-i-tsentralnaya-peremennaya', targetSlug: 'lineynoe-myshlenie-v-kompleksnykh-sistemakh', relationType: 'RELATED', strength: 0.75 },
  // Cross-branch DEEPENS
  { sourceSlug: 'remontnoe-povedenie-vmesto-sistemnogo-analiza', targetSlug: 'lineynoe-myshlenie-v-kompleksnykh-sistemakh', relationType: 'DEEPENS', strength: 0.7 },
  { sourceSlug: 'markaryan-critical-thinking-popularity', targetSlug: 'pereotsenka-aktualnogo-motiva', relationType: 'CONTRASTS', strength: 0.5 },
  // STRATEGY → LOGIC cross-links
  { sourceSlug: 'markaryan-narrative-programming', targetSlug: 'markaryan-critical-thinking-popularity', relationType: 'APPLIES_IN', strength: 0.55 },
];

async function seedRelations() {
  console.log('\n── Seeding concept relations ──');

  const concepts = await prisma.concept.findMany({
    select: { id: true, slug: true },
  });

  const slugToId = new Map(concepts.map((c) => [c.slug, c.id]));
  let created = 0;
  let skipped = 0;

  for (const rel of CONCEPT_RELATIONS) {
    const sourceId = slugToId.get(rel.sourceSlug);
    const targetId = slugToId.get(rel.targetSlug);

    if (!sourceId || !targetId) {
      console.log(`  ⚠ Slug not found: ${!sourceId ? rel.sourceSlug : rel.targetSlug}`);
      skipped++;
      continue;
    }

    await prisma.conceptRelation.upsert({
      where: {
        sourceId_targetId_relationType: {
          sourceId,
          targetId,
          relationType: rel.relationType,
        },
      },
      update: { strength: rel.strength },
      create: {
        sourceId,
        targetId,
        relationType: rel.relationType,
        strength: rel.strength,
      },
    });
    created++;
  }

  console.log(`✓ Relations: ${created} seeded, ${skipped} skipped`);
}

// ── B24.3: Seed depth layers for first concepts ─────────────────────────

interface DepthLayerSeed {
  conceptSlug: string;
  layerType: DepthLayerType;
  content: Record<string, unknown>;
  sourceRef: string;
}

const DEPTH_LAYERS: DepthLayerSeed[] = [
  // ─ Аргумент от популярности (LOGIC, BRONZE) ─
  {
    conceptSlug: 'markaryan-critical-thinking-popularity',
    layerType: 'SCIENCE',
    content: {
      title: 'Наука за этим',
      findings: [
        { study: 'Bandwagon Effect — Leibenstein (1950)', year: 1950, finding: 'Люди покупают товар чаще, если видят, что другие его покупают. Спрос растёт просто от популярности.', implication: 'Популярность — самоусиливающийся цикл, не связанный с качеством.' },
        { study: 'Informational Cascades — Bikhchandani, Hirshleifer & Welch', year: 1992, finding: 'Люди отказываются от собственных сигналов, если видят, что толпа действует иначе. Каскад может быть основан на минимальной начальной информации.', implication: 'Массовое мнение может быть построено на ошибке первых нескольких человек.' },
      ],
      summary: 'Популярность — это социальный сигнал, а не показатель истины. Каскады формируются из шума.',
    },
    sourceRef: 'Seed data',
  },
  {
    conceptSlug: 'markaryan-critical-thinking-popularity',
    layerType: 'BOOK',
    content: {
      title: 'Что читать',
      books: [
        { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', year: 2011, keyIdea: 'Система 1 принимает решения на автопилоте — популярность воспринимается как доказательство.', whyMatters: 'Понимание двух систем мышления защищает от слепого следования толпе.' },
        { title: 'The Wisdom of Crowds', author: 'James Surowiecki', year: 2004, keyIdea: 'Толпа бывает мудра — но только при независимости суждений. Когда люди копируют друг друга, мудрость исчезает.', whyMatters: 'Разграничивает здоровый коллективный разум от стадного эффекта.' },
      ],
    },
    sourceRef: 'Seed data',
  },
  // ─ Ремонтное поведение (STRATEGY, BRONZE) ─
  {
    conceptSlug: 'remontnoe-povedenie-vmesto-sistemnogo-analiza',
    layerType: 'SCIENCE',
    content: {
      title: 'Наука за этим',
      findings: [
        { study: 'Lohhausen Experiment — Dörner et al.', year: 1983, finding: 'Участники-бургомистры симуляции занимались мелкими видимыми проблемами вместо анализа системных причин упадка города.', implication: 'Без конкретизации целей человек переключается на ремонт случайно обнаруженных проблем.' },
        { study: 'Satisficing — Herbert Simon', year: 1956, finding: 'Люди выбирают «достаточно хорошее» решение вместо оптимального из-за когнитивных ограничений.', implication: 'Ремонтное поведение — крайняя форма satisficing, когда даже цели не определены.' },
      ],
      summary: 'Без чёткой целевой структуры мозг сводит всё к реактивному устранению видимого.',
    },
    sourceRef: 'Seed data',
  },
  {
    conceptSlug: 'remontnoe-povedenie-vmesto-sistemnogo-analiza',
    layerType: 'PHILOSOPHY',
    content: {
      title: 'Глубокие корни',
      context: 'Ещё Сенека предупреждал: «Нет попутного ветра для того, кто не знает, куда плывёт». Ремонтное поведение — это плавание без курса. Аристотель в «Никомаховой этике» подчёркивал, что добродетель невозможна без правильной постановки целей — «телос» определяет действие.',
      thinkers: [
        { name: 'Сенека', era: 'Древний Рим', connection: 'Стоическая философия целеполагания: без цели любое действие бессмысленно' },
        { name: 'Аристотель', era: 'Древняя Греция', connection: 'Телеологический подход — каждое действие должно быть направлено к конечной цели (телос)' },
      ],
      quote: { text: 'Когда человек не знает, к какой пристани он держит путь, ни один ветер не будет попутным.', author: 'Сенека' },
    },
    sourceRef: 'Seed data',
  },
  // ─ Линейное мышление (LOGIC, SILVER) ─
  {
    conceptSlug: 'lineynoe-myshlenie-v-kompleksnykh-sistemakh',
    layerType: 'SCIENCE',
    content: {
      title: 'Наука за этим',
      findings: [
        { study: 'Tanaland Experiment — Dörner', year: 1975, finding: 'Участники улучшали медицину и сельское хозяйство, не учитывая рост населения. Итог — голод.', implication: 'Линейные решения в нелинейных системах создают эффект кобры.' },
        { study: 'System Dynamics — Jay Forrester', year: 1961, finding: 'Социальные системы контринтуитивны: очевидное решение часто ухудшает ситуацию из-за петель обратной связи.', implication: 'Нужно моделировать систему, а не реагировать на симптомы.' },
      ],
      summary: 'Линейное мышление — дефолт мозга. Системное мышление — навык, который нужно тренировать.',
    },
    sourceRef: 'Seed data',
  },
  {
    conceptSlug: 'lineynoe-myshlenie-v-kompleksnykh-sistemakh',
    layerType: 'BOOK',
    content: {
      title: 'Что читать',
      books: [
        { title: 'The Logic of Failure', author: 'Dietrich Dörner', year: 1996, keyIdea: 'Неудачи в управлении сложными системами закономерны: мозг не приспособлен к многофакторному анализу.', whyMatters: 'Главный первоисточник — эксперименты Дёрнера формируют понимание системного мышления.' },
        { title: 'Thinking in Systems', author: 'Donella Meadows', year: 2008, keyIdea: 'Система — это больше, чем сумма частей. Точки рычага (leverage points) позволяют менять систему минимальным усилием.', whyMatters: 'Практический фреймворк для перехода от линейного к системному мышлению.' },
      ],
    },
    sourceRef: 'Seed data',
  },
  // ─ Недооценка экспоненциальных процессов (LOGIC, SILVER) ─
  {
    conceptSlug: 'nedootsenka-eksponentsialnykh-protsessov',
    layerType: 'SCIENCE',
    content: {
      title: 'Наука за этим',
      findings: [
        { study: 'Exponential Growth Bias — Stango & Zinman', year: 2009, finding: 'Люди систематически недооценивают сложные проценты на 30-50%, что приводит к плохим финансовым решениям.', implication: 'Это не просто математическая ошибка — это когнитивное искажение, встроенное в мозг.' },
        { study: 'COVID-19 Perception Studies', year: 2020, finding: 'В начале пандемии большинство людей не могли представить экспоненциальный рост заражений, пока не стало слишком поздно.', implication: 'Экспоненциальная слепота — вопрос жизни и смерти, не только математики.' },
      ],
      summary: 'Мозг мыслит линейно. Экспонента ломает интуицию — каждый раз.',
    },
    sourceRef: 'Seed data',
  },
  // ─ Ментальная репетиция (STRATEGY, SILVER) ─
  {
    conceptSlug: 'markaryan-mental-rehearsal',
    layerType: 'SCIENCE',
    content: {
      title: 'Наука за этим',
      findings: [
        { study: 'Motor imagery and muscle strength — Yue & Cole', year: 1992, finding: 'Группа, тренировавшаяся только мысленно, показала 22% прироста силы мышц. Контрольная группа — 0%.', implication: 'Мозг не различает реальную и мысленную практику на уровне нейронных паттернов.' },
        { study: 'Mental practice of piano scales — Pascual-Leone et al.', year: 1995, finding: 'Мысленная практика фортепиано создавала те же кортикальные карты, что и физическая тренировка.', implication: 'Ментальная репетиция — полноценный инструмент формирования моторных навыков.' },
      ],
      summary: 'Мысленная тренировка работает. 22% прироста силы без единого подхода — это не эзотерика, а нейронаука.',
    },
    sourceRef: 'Seed data',
  },
  {
    conceptSlug: 'markaryan-mental-rehearsal',
    layerType: 'ALTERNATIVE',
    content: {
      title: 'Другой угол',
      alternativeView: 'В восточных единоборствах «ката» — формальные упражнения — изначально практиковались мысленно монахами, которым запрещали драться. Они создали целую систему боя через визуализацию. Современная спортивная психология пришла к тому же выводу 1000 лет спустя.',
      metaphor: 'Мозг — симулятор. Мысленная тренировка — это прогон программы на эмуляторе перед запуском на реальном железе.',
      author: 'Максуэлл Мальц (Психокибернетика, 1960)',
    },
    sourceRef: 'Seed data',
  },
  // ─ Нарративное программирование (STRATEGY, GOLD) ─
  {
    conceptSlug: 'markaryan-narrative-programming',
    layerType: 'PHILOSOPHY',
    content: {
      title: 'Глубокие корни',
      context: 'Платон предлагал изгнать поэтов из идеального государства — потому что понимал силу нарратива. Истории формируют ценности сильнее законов. Джозеф Кэмпбелл показал, что все культуры строятся на одном и том же мономифе — путешествие героя. Мы не выбираем свои истории — они выбирают нас.',
      thinkers: [
        { name: 'Платон', era: 'Древняя Греция', connection: 'Осознавал программирующую силу историй — поэтому хотел контролировать нарративы в государстве' },
        { name: 'Джозеф Кэмпбелл', era: 'XX век', connection: 'Мономиф — универсальная структура историй, через которую культуры транслируют ценности' },
        { name: 'Джером Брунер', era: 'XX век', connection: 'Нарративная психология — мы понимаем мир через истории, а не через логику' },
      ],
      quote: { text: 'Миром управляет тот, чьи рассказы слушают.', author: 'Арсен Маркарян' },
    },
    sourceRef: 'Seed data',
  },
];

async function seedDepthLayers() {
  console.log('\n── Seeding depth layers ──');

  const concepts = await prisma.concept.findMany({
    select: { id: true, slug: true },
  });

  const slugToId = new Map(concepts.map((c) => [c.slug, c.id]));
  let created = 0;
  let skipped = 0;

  for (const layer of DEPTH_LAYERS) {
    const conceptId = slugToId.get(layer.conceptSlug);
    if (!conceptId) {
      console.log(`  ⚠ Concept not found: ${layer.conceptSlug}`);
      skipped++;
      continue;
    }

    const existing = await prisma.depthLayer.findUnique({
      where: { conceptId_layerType: { conceptId, layerType: layer.layerType } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.depthLayer.create({
      data: {
        conceptId,
        layerType: layer.layerType,
        content: JSON.parse(JSON.stringify(layer.content)),
        sourceRef: layer.sourceRef,
      },
    });
    created++;
  }

  console.log(`✓ Depth layers: ${created} seeded, ${skipped} skipped`);
}

// ── B24.4: Seed daily cards for first 17 learning days ──────────────────

interface CardSeed {
  type: string;
  content: Record<string, unknown>;
}

function generateCards(
  concept: { nameRu: string; description: string },
  prev: { nameRu: string } | null,
  next: { nameRu: string } | null,
): CardSeed[] {
  return [
    { type: 'hook', content: { text: `А ты уверен, что понимаешь, как работает "${concept.nameRu}"?` } },
    { type: 'explanation', content: { text: concept.description } },
    { type: 'evidence', content: { text: 'Научные данные будут добавлены при генерации через AI.' } },
    { type: 'example', content: { text: 'Пример из жизни будет добавлен при генерации через AI.' } },
    {
      type: 'quiz',
      content: {
        question: `Какое утверждение лучше всего описывает суть концепта "${concept.nameRu}"?`,
        options: [
          concept.description.slice(0, 80) + '...',
          'Это распространённое заблуждение без научного подкрепления',
          'Это работает только в теории, не на практике',
          'Это верно лишь для узкой группы людей',
        ],
        correctIndex: 0,
        explanations: [
          'Верно — это ключевая суть концепта.',
          'Неверно — концепт имеет научное подкрепление.',
          'Неверно — есть практические примеры применения.',
          'Неверно — концепт универсален.',
        ],
      },
    },
    { type: 'explain', content: { prompt: `Объясни своими словами: что такое "${concept.nameRu}" и почему это важно?` } },
    { type: 'thread', content: { yesterday: prev?.nameRu ?? null, today: concept.nameRu, tomorrow: next?.nameRu ?? null } },
    { type: 'wisdom', content: { quote: 'Мудрость — не в знании, а в применении знания.', author: 'Конфуций' } },
  ];
}

// ── B24.5: 5 determination situations (frontend-rendered, stored as JSON) ─

const DETERMINATION_SITUATIONS = [
  {
    index: 1,
    branch: 'STRATEGY',
    title: 'Карьерный тупик',
    scenario: 'Ты застрял на одной позиции 3 года. Зарплата не растёт, а коллега, который пришёл позже, уже получил повышение.',
    options: [
      { text: 'Проанализирую, какие навыки объективно нужны для повышения, и построю план', style: 'analytical' },
      { text: 'Поговорю с руководителем напрямую и попрошу обратную связь', style: 'practical' },
      { text: 'Задумаюсь: а действительно ли мне нужно повышение, или это навязанная цель?', style: 'philosophical' },
      { text: 'Начну искать работу — если здесь не ценят, найду место, где оценят', style: 'practical' },
    ],
  },
  {
    index: 2,
    branch: 'LOGIC',
    title: 'Информационный шум',
    scenario: 'Ты читаешь противоречивые советы от экспертов: один говорит инвестировать в крипту, другой — что это пузырь. Оба приводят убедительные аргументы.',
    options: [
      { text: 'Разберу аргументы каждого: какие данные, какая методология, какие конфликты интересов', style: 'analytical' },
      { text: 'Посмотрю, кто из них показал лучший трек-рекорд предсказаний', style: 'practical' },
      { text: 'Подумаю: почему люди вообще доверяют «экспертам»? Что делает мнение авторитетным?', style: 'philosophical' },
      { text: 'Вложу маленькую сумму и проверю на практике, прежде чем слушать кого-то', style: 'practical' },
    ],
  },
  {
    index: 3,
    branch: 'ERUDITION',
    title: 'Спор за столом',
    scenario: 'На семейном ужине родственник заявляет, что «раньше люди были здоровее, потому что ели натуральное». Все кивают.',
    options: [
      { text: 'Приведу статистику: средняя продолжительность жизни 100 лет назад была 40 лет', style: 'analytical' },
      { text: 'Спрошу: «А что конкретно ты имеешь в виду под натуральным? Мышьяк тоже натуральный»', style: 'practical' },
      { text: 'Задумаюсь: откуда у нас ностальгия по прошлому? Почему «раньше» = «лучше» в головах людей?', style: 'philosophical' },
      { text: 'Промолчу — за ужином не место для споров, но запомню аргумент для будущего разговора', style: 'practical' },
    ],
  },
  {
    index: 4,
    branch: 'RHETORIC',
    title: 'Конфликт в команде',
    scenario: 'Коллега публично обвинил тебя в ошибке на совещании. Ты уверен, что ошибка была не твоя, но все смотрят на тебя.',
    options: [
      { text: 'Спокойно разберу факты: «Давай посмотрим на таймлайн — кто что делал и когда»', style: 'analytical' },
      { text: 'Отвечу коротко: «Разберёмся после совещания» — и разберусь лично', style: 'practical' },
      { text: 'Подумаю: почему он атаковал публично? Что стоит за этим — страх, конкуренция, давление сверху?', style: 'philosophical' },
      { text: 'Скажу: «Я ценю, что ты поднял это. Давай после совещания вместе найдём причину»', style: 'practical' },
    ],
  },
  {
    index: 5,
    branch: 'INTUITION',
    title: 'Решение без данных',
    scenario: 'Тебе предлагают партнёрство в бизнесе. Цифры выглядят хорошо, партнёр вызывает доверие, но что-то внутри говорит «не стоит».',
    options: [
      { text: 'Проверю цифры ещё раз: финмодель, рынок, конкурентов. Может, интуиция реагирует на пробел в данных', style: 'analytical' },
      { text: 'Поговорю с людьми, кто уже работал с этим человеком — соберу внешнюю информацию', style: 'practical' },
      { text: 'Задумаюсь: откуда это чувство? Может, это страх выхода из зоны комфорта, а не реальный сигнал?', style: 'philosophical' },
      { text: 'Доверюсь интуиции — опыт формирует чутьё, которое быстрее рацио', style: 'practical' },
    ],
  },
];

async function seedDetermination() {
  console.log('\n── Seeding determination situations ──');

  // Store as a system config or in a JSON file
  // The determination is purely frontend-driven — situations are hardcoded
  // but we save them to a config for reference and potential admin editing
  const { writeFileSync, mkdirSync, existsSync } = await import('fs');
  const { resolve } = await import('path');

  const dir = resolve(__dirname, '..', 'content', 'processed');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const outputPath = resolve(dir, 'determination-situations.json');
  writeFileSync(outputPath, JSON.stringify(DETERMINATION_SITUATIONS, null, 2));

  console.log(`✓ Determination situations: ${DETERMINATION_SITUATIONS.length} saved to ${outputPath}`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Learning System Seed ===\n');

  // Check if concepts exist
  const conceptCount = await prisma.concept.count();
  if (conceptCount === 0) {
    console.log('⚠ No concepts found. Run `npx ts-node scripts/seed-concepts.ts` first.');
    return;
  }
  console.log(`Found ${conceptCount} concepts in DB`);

  // B24.2: Relations
  await seedRelations();

  // B24.3: Depth layers
  await seedDepthLayers();

  // B24.4: Assemble learning days and seed cards
  await seedLearningDays();

  // B24.5: Determination situations
  await seedDetermination();

  console.log('\n=== Learning Seed Complete ===');
}

async function seedLearningDays() {
  console.log('\n── Seeding learning days (template path) ──');

  // Get concepts ordered by difficulty for level assembly
  const concepts = await prisma.concept.findMany({
    orderBy: [{ difficulty: 'asc' }, { bloomLevel: 'asc' }, { branch: 'asc' }],
    select: { id: true, slug: true, nameRu: true, description: true, branch: true, difficulty: true },
  });

  const levels = [
    { name: 'Level 1', days: 5, difficulties: ['BRONZE'], branches: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] },
    { name: 'Level 2', days: 5, difficulties: ['BRONZE', 'SILVER'], branches: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] },
    { name: 'Level 3', days: 7, difficulties: ['SILVER'], branches: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] },
  ];

  // Create or find template user for template path
  let templateUser = await prisma.user.findFirst({ where: { name: '__template__' } });

  if (!templateUser) {
    templateUser = await prisma.user.create({
      data: {
        name: '__template__',
        role: 'USER',
      },
    });
    console.log('  Created template user: __template__');
  }

  // Check if template path already exists
  const existingPath = await prisma.learningPath.findUnique({
    where: { userId: templateUser.id },
  });

  if (existingPath) {
    console.log('  Template learning path already exists, skipping');
    return;
  }

  // Create template learning path
  const path = await prisma.learningPath.create({
    data: {
      userId: templateUser.id,
      currentLevel: 'SLEEPING',
      currentDay: 1,
    },
  });

  const usedIds = new Set<string>();
  let dayNumber = 0;
  let totalDays = 0;

  for (const level of levels) {
    for (let d = 0; d < level.days; d++) {
      dayNumber++;
      const targetBranch = level.branches[d % level.branches.length]!;

      // Find concept for this day
      const concept =
        concepts.find((c) => !usedIds.has(c.id) && c.branch === targetBranch && level.difficulties.includes(c.difficulty)) ??
        concepts.find((c) => !usedIds.has(c.id) && level.difficulties.includes(c.difficulty));

      if (!concept) continue;
      usedIds.add(concept.id);

      const prevConcept = dayNumber > 1 ? concepts.find((c) => usedIds.has(c.id) && c.id !== concept.id) : null;
      const nextIdx = concepts.findIndex((c) => !usedIds.has(c.id) && level.difficulties.includes(c.difficulty));
      const nextConcept = nextIdx >= 0 ? (concepts[nextIdx] ?? null) : null;

      const cards = generateCards(concept, prevConcept ?? null, nextConcept);

      await prisma.learningDay.create({
        data: {
          pathId: path.id,
          dayNumber,
          conceptId: concept.id,
          cards: JSON.parse(JSON.stringify(cards)),
        },
      });

      totalDays++;
    }
  }

  console.log(`✓ Learning days: ${totalDays} created for template path`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
