import { PrismaClient, Branch, Difficulty, Role } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// ── Stable UUIDs so modules can reference questions ──────────

const qIds = Array.from({ length: 20 }, () => randomUUID());

// ── Questions ────────────────────────────────────────────────

interface QuestionSeed {
  id: string;
  category: string;
  branch: Branch;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  statPrimary: string;
  statSecondary?: string;
}

const questions: QuestionSeed[] = [
  // ═══════════════ STRATEGY (10) ═══════════════

  // --- Первые принципы (5) ---
  {
    id: qIds[0],
    category: "Первые принципы",
    branch: "STRATEGY",
    difficulty: "BRONZE",
    text: "Илон Маск хотел удешевить ракету. Вместо покупки готовой он разложил её на материалы и выяснил, что сырьё стоит 2 % от цены ракеты. Какой метод он применил?",
    options: [
      "Бенчмаркинг",
      "Мышление первыми принципами",
      "Метод аналогий",
      "SWOT-анализ",
    ],
    correctIndex: 1,
    explanation:
      "Мышление первыми принципами — это разложение проблемы до базовых, неделимых истин и построение решения заново, минуя готовые допущения рынка.",
    statPrimary: "strategyXp",
    statSecondary: "logicXp",
  },
  {
    id: qIds[1],
    category: "Первые принципы",
    branch: "STRATEGY",
    difficulty: "BRONZE",
    text: "Какой вопрос лучше всего помогает добраться до первого принципа?",
    options: [
      "Кто ещё так делает?",
      "Что мы знаем наверняка и не можем упростить?",
      "Какой бюджет у конкурента?",
      "Какова рыночная цена?",
    ],
    correctIndex: 1,
    explanation:
      "Вопрос «Что мы знаем наверняка?» отсекает допущения и приводит к фундаментальным фактам, с которых начинается рассуждение по первым принципам.",
    statPrimary: "strategyXp",
  },
  {
    id: qIds[2],
    category: "Первые принципы",
    branch: "STRATEGY",
    difficulty: "SILVER",
    text: "Компания продаёт воду в бутылках. Себестоимость бутылки — 3 ₽, воды — 0.5 ₽, логистики — 10 ₽, маркетинга — 8 ₽. Розничная цена — 80 ₽. Что подсказывает анализ первыми принципами?",
    options: [
      "Надо поднять цену",
      "Самый большой рычаг — снижение логистики и маркетинга",
      "Нужно сменить поставщика бутылок",
      "Следует разлить воду в стеклянные бутылки",
    ],
    correctIndex: 1,
    explanation:
      "Разложив структуру до элементарных затрат, видно, что логистика и маркетинг — 84 % себестоимости. Именно там главный рычаг оптимизации.",
    statPrimary: "strategyXp",
    statSecondary: "eruditionXp",
  },
  {
    id: qIds[3],
    category: "Первые принципы",
    branch: "STRATEGY",
    difficulty: "SILVER",
    text: "Аристотель определял «первый принцип» как основу, которую нельзя вывести из другого утверждения. Какой современный термин ближе всего к этому определению?",
    options: [
      "Гипотеза",
      "Аксиома",
      "Теорема",
      "Постулат",
    ],
    correctIndex: 1,
    explanation:
      "Аксиома — утверждение, принимаемое без доказательства и являющееся основой для дальнейших рассуждений, что соответствует аристотелевскому «первому принципу».",
    statPrimary: "strategyXp",
    statSecondary: "eruditionXp",
  },
  {
    id: qIds[4],
    category: "Первые принципы",
    branch: "STRATEGY",
    difficulty: "GOLD",
    text: "Netflix разложил потребность «посмотреть фильм вечером» на первые принципы: экран, контент, удобство выбора, мгновенный доступ. Какой элемент устранил необходимость физических носителей?",
    options: [
      "Экран",
      "Контент",
      "Мгновенный доступ через интернет",
      "Удобство выбора",
    ],
    correctIndex: 2,
    explanation:
      "Именно принцип «мгновенный доступ» показал, что DVD — лишь текущая реализация доставки контента, которую можно заменить стримингом.",
    statPrimary: "strategyXp",
  },

  // --- Инверсия (5) ---
  {
    id: qIds[5],
    category: "Инверсия",
    branch: "STRATEGY",
    difficulty: "BRONZE",
    text: "Чарли Мангер говорил: «Скажите мне, где я умру, — и я туда не пойду». Какой метод мышления он описывал?",
    options: [
      "Визуализация успеха",
      "Инверсия — думать от обратного",
      "Прогнозирование трендов",
      "Оптимизм",
    ],
    correctIndex: 1,
    explanation:
      "Инверсия — метод, при котором вместо поиска путей к успеху вы определяете, что гарантированно ведёт к провалу, и избегаете этого.",
    statPrimary: "strategyXp",
    statSecondary: "intuitionXp",
  },
  {
    id: qIds[6],
    category: "Инверсия",
    branch: "STRATEGY",
    difficulty: "BRONZE",
    text: "Вы хотите повысить удовлетворённость клиентов. Как сформулировать задачу методом инверсии?",
    options: [
      "Как сделать клиентов счастливее?",
      "Что точно сделает клиентов несчастными?",
      "Какой бюджет выделить на программу лояльности?",
      "Что делают конкуренты для удержания клиентов?",
    ],
    correctIndex: 1,
    explanation:
      "Инверсия предлагает сначала составить список вещей, которые гарантированно вызовут недовольство клиентов, а затем устранить каждую из них.",
    statPrimary: "strategyXp",
  },
  {
    id: qIds[7],
    category: "Инверсия",
    branch: "STRATEGY",
    difficulty: "SILVER",
    text: "Вы руководите стартапом. Применяя инверсию, вы спрашиваете: «Как гарантированно убить стартап за полгода?» Какой из ответов НЕ является примером инверсии?",
    options: [
      "Не разговаривать с пользователями",
      "Тратить весь бюджет на маркетинг без продукта",
      "Нанять лучших инженеров",
      "Игнорировать юнит-экономику",
    ],
    correctIndex: 2,
    explanation:
      "«Нанять лучших инженеров» — позитивное действие, а не гарантированный путь к провалу. Остальные варианты — классические ошибки, выявляемые инверсией.",
    statPrimary: "strategyXp",
    statSecondary: "logicXp",
  },
  {
    id: qIds[8],
    category: "Инверсия",
    branch: "STRATEGY",
    difficulty: "GOLD",
    text: "Якоб Бернулли применил инверсию в теории вероятностей: вместо подсчёта P(A) он вычислял 1 − P(не A). Где этот приём наиболее эффективен?",
    options: [
      "Когда P(A) легко считается напрямую",
      "Когда событие A составное и его проще описать через отрицание",
      "Когда выборка слишком мала",
      "Когда нужна точность до сотых",
    ],
    correctIndex: 1,
    explanation:
      "Инверсия в вероятностях выгодна, когда прямой подсчёт требует перебора множества комбинаций, а дополнение события описывается проще.",
    statPrimary: "strategyXp",
    statSecondary: "logicXp",
  },
  {
    id: qIds[9],
    category: "Инверсия",
    branch: "STRATEGY",
    difficulty: "GOLD",
    text: "Pre-mortem — техника, при которой команда заранее представляет, что проект провалился, и ищет причины. Это пример инверсии, потому что:",
    options: [
      "Команда обсуждает риски после запуска",
      "Команда начинает с результата-провала и движется к причинам в прошлом",
      "Команда оптимизирует бюджет",
      "Команда фокусируется только на позитивных сценариях",
    ],
    correctIndex: 1,
    explanation:
      "Pre-mortem инвертирует временну́ю перспективу: вы «начинаете с конца», представляя провал уже случившимся, и ищете причины — это классическая инверсия.",
    statPrimary: "strategyXp",
    statSecondary: "intuitionXp",
  },

  // ═══════════════ LOGIC (10) ═══════════════

  // --- Когнитивные искажения (5) ---
  {
    id: qIds[10],
    category: "Когнитивные искажения",
    branch: "LOGIC",
    difficulty: "BRONZE",
    text: "Вы купили билет на концерт за 5 000 ₽. В день концерта заболели. Друг уговаривает: «Деньги уже потрачены — надо идти!» Какое когнитивное искажение он использует?",
    options: [
      "Эффект якоря",
      "Ошибка невозвратных затрат (Sunk Cost Fallacy)",
      "Эффект ореола",
      "Предвзятость подтверждения",
    ],
    correctIndex: 1,
    explanation:
      "Ошибка невозвратных затрат — склонность продолжать действие из-за уже вложенных ресурсов, хотя они не вернутся независимо от решения.",
    statPrimary: "logicXp",
  },
  {
    id: qIds[11],
    category: "Когнитивные искажения",
    branch: "LOGIC",
    difficulty: "BRONZE",
    text: "Рекламщик выставляет телевизор за 199 990 ₽ рядом с моделью за 89 990 ₽, чтобы вторая казалась дешёвой. Какое это искажение?",
    options: [
      "Эффект фрейминга",
      "Эффект якоря (Anchoring)",
      "Каскад доступности",
      "Эффект владения",
    ],
    correctIndex: 1,
    explanation:
      "Эффект якоря — наше суждение «привязывается» к первому числу (якорю). Высокая цена первого телевизора делает второй субъективно привлекательным.",
    statPrimary: "logicXp",
    statSecondary: "eruditionXp",
  },
  {
    id: qIds[12],
    category: "Когнитивные искажения",
    branch: "LOGIC",
    difficulty: "SILVER",
    text: "Менеджер нанимает только выпускников своего вуза, считая их лучшими. Какие два искажения здесь пересекаются?",
    options: [
      "Якорь и фрейминг",
      "Предвзятость подтверждения и эффект ореола (In-group bias + Halo Effect)",
      "Невозвратные затраты и оптимизм",
      "Каскад доступности и слепое пятно",
    ],
    correctIndex: 1,
    explanation:
      "In-group bias: предпочтение «своих». Halo Effect: один признак (вуз) ассоциируется с общей компетентностью без доказательств.",
    statPrimary: "logicXp",
    statSecondary: "rhetoricXp",
  },
  {
    id: qIds[13],
    category: "Когнитивные искажения",
    branch: "LOGIC",
    difficulty: "SILVER",
    text: "После авиакатастрофы люди массово отменяют рейсы, хотя статистически самолёт безопаснее автомобиля. Какое искажение срабатывает?",
    options: [
      "Ошибка планирования",
      "Эвристика доступности (Availability Heuristic)",
      "Эффект Даннинга-Крюгера",
      "Ретроспективное искажение",
    ],
    correctIndex: 1,
    explanation:
      "Эвристика доступности: мы оцениваем вероятность события по тому, насколько легко вспоминаем примеры. Яркая катастрофа затмевает статистику.",
    statPrimary: "logicXp",
  },
  {
    id: qIds[14],
    category: "Когнитивные искажения",
    branch: "LOGIC",
    difficulty: "GOLD",
    text: "Трейдер замечает паттерн в случайных колебаниях рынка и начинает торговать по нему. Первые сделки прибыльны, что «подтверждает» паттерн. Какая комбинация искажений работает?",
    options: [
      "Якорь + ореол",
      "Апофения (поиск паттернов в шуме) + предвзятость подтверждения",
      "Невозвратные затраты + оптимизм",
      "Эффект владения + неприятие потерь",
    ],
    correctIndex: 1,
    explanation:
      "Апофения заставляет видеть паттерн в случайных данных. Предвзятость подтверждения затем фильтрует информацию: прибыльные сделки запоминаются, убыточные игнорируются.",
    statPrimary: "logicXp",
    statSecondary: "strategyXp",
  },

  // --- Логические ошибки (5) ---
  {
    id: qIds[15],
    category: "Логические ошибки",
    branch: "LOGIC",
    difficulty: "BRONZE",
    text: "«Миллионы людей верят в гороскопы — значит, астрология работает». Какая это логическая ошибка?",
    options: [
      "Ad hominem",
      "Argumentum ad populum (апелляция к большинству)",
      "Соломенное чучело",
      "Ложная дилемма",
    ],
    correctIndex: 1,
    explanation:
      "Argumentum ad populum — ошибка, при которой истинность утверждения «доказывается» его популярностью. Количество верящих не является аргументом.",
    statPrimary: "logicXp",
    statSecondary: "rhetoricXp",
  },
  {
    id: qIds[16],
    category: "Логические ошибки",
    branch: "LOGIC",
    difficulty: "BRONZE",
    text: "«Вы не можете критиковать политику компании, ведь вы тоже допускали ошибки». Какая это ошибка?",
    options: [
      "Скользкий склон",
      "Tu quoque (а ты сам?)",
      "Подмена тезиса",
      "Ложная причина",
    ],
    correctIndex: 1,
    explanation:
      "Tu quoque — разновидность ad hominem, когда вместо ответа на аргумент указывают на поведение оппонента. Чужие ошибки не опровергают критику.",
    statPrimary: "logicXp",
    statSecondary: "rhetoricXp",
  },
  {
    id: qIds[17],
    category: "Логические ошибки",
    branch: "LOGIC",
    difficulty: "SILVER",
    text: "«Если мы разрешим сотрудникам работать из дома по пятницам, скоро они захотят работать удалённо всю неделю, а потом вообще перестанут приходить». Какая ошибка?",
    options: [
      "Скользкий склон (Slippery Slope)",
      "Ложная дилемма",
      "Argumentum ad populum",
      "Подмена тезиса",
    ],
    correctIndex: 0,
    explanation:
      "Скользкий склон — цепочка предполагаемых последствий без обоснования каждого шага. Разрешение одного дня удалёнки логически не ведёт к полному отказу от офиса.",
    statPrimary: "logicXp",
  },
  {
    id: qIds[18],
    category: "Логические ошибки",
    branch: "LOGIC",
    difficulty: "GOLD",
    text: "«После введения обязательной вакцинации число случаев аутизма выросло. Значит, вакцины вызывают аутизм». Какие ДВЕ ошибки здесь присутствуют?",
    options: [
      "Ad hominem + подмена тезиса",
      "Post hoc ergo propter hoc + корреляция ≠ причинность",
      "Скользкий склон + ложная дилемма",
      "Апелляция к авторитету + апелляция к природе",
    ],
    correctIndex: 1,
    explanation:
      "Post hoc ergo propter hoc: «после — значит вследствие». Корреляция ≠ причинность: два тренда совпали по времени, но рост диагнозов аутизма объясняется улучшением диагностики.",
    statPrimary: "logicXp",
    statSecondary: "eruditionXp",
  },
  {
    id: qIds[19],
    category: "Логические ошибки",
    branch: "LOGIC",
    difficulty: "GOLD",
    text: "«Либо мы полностью запрещаем ИИ, либо даём ему неограниченную свободу. Третьего не дано». Какая это ошибка и почему она опасна?",
    options: [
      "Ложная дилемма — исключает весь спектр промежуточных решений (регулирование, аудит, стандарты)",
      "Скользкий склон — предполагает необратимые последствия",
      "Ad populum — ссылается на мнение большинства",
      "Подмена тезиса — смещает тему дискуссии",
    ],
    correctIndex: 0,
    explanation:
      "Ложная дилемма сводит сложный вопрос к двум крайностям, отсекая все промежуточные варианты: регулирование, стандарты безопасности, этические рамки.",
    statPrimary: "logicXp",
    statSecondary: "strategyXp",
  },
];

// ── Modules ──────────────────────────────────────────────────

const modules = [
  {
    branch: "STRATEGY" as Branch,
    orderIndex: 1,
    title: "Первые принципы",
    description:
      "Научитесь разбирать любую проблему до неделимых истин и строить решения с нуля, минуя шаблоны и допущения.",
    questionIds: qIds.slice(0, 5),
  },
  {
    branch: "STRATEGY" as Branch,
    orderIndex: 2,
    title: "Инверсия",
    description:
      "Освойте метод обратного мышления: вместо поиска успеха определяйте и устраняйте причины провала.",
    questionIds: qIds.slice(5, 10),
  },
  {
    branch: "LOGIC" as Branch,
    orderIndex: 1,
    title: "Когнитивные искажения",
    description:
      "Распознавайте ловушки мышления — от эффекта якоря до предвзятости подтверждения — и принимайте решения рационально.",
    questionIds: qIds.slice(10, 15),
  },
  {
    branch: "LOGIC" as Branch,
    orderIndex: 2,
    title: "Логические ошибки",
    description:
      "Изучите классические логические ошибки в аргументации: от ad hominem до ложной дилеммы — и научитесь их опровергать.",
    questionIds: qIds.slice(15, 20),
  },
];

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log("Seeding РАЗУМ database...\n");

  // 1. Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@razum.app" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@razum.app",
      role: Role.ADMIN,
      stats: {
        create: {},
      },
    },
  });
  console.log(`✓ Admin user: ${admin.id}`);

  // 2. Questions
  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id,
        category: q.category,
        branch: q.branch,
        difficulty: q.difficulty,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        statPrimary: q.statPrimary,
        statSecondary: q.statSecondary ?? null,
      },
    });
  }
  console.log(`✓ Questions: ${questions.length} seeded`);

  // 3. Modules
  for (const m of modules) {
    await prisma.module.upsert({
      where: {
        branch_orderIndex: {
          branch: m.branch,
          orderIndex: m.orderIndex,
        },
      },
      update: {},
      create: {
        branch: m.branch,
        orderIndex: m.orderIndex,
        title: m.title,
        description: m.description,
        questionIds: m.questionIds,
      },
    });
  }
  console.log(`✓ Modules: ${modules.length} seeded`);

  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
