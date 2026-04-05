# РАЗУМ — Техническая архитектура

## Стек технологий

| Слой | Технология | Версия | Назначение |
|------|-----------|--------|------------|
| Frontend | Next.js (App Router) | 14+ | PWA, SSR, маршрутизация |
| UI | React | 18+ | Компоненты |
| PWA | Serwist | latest | Service worker, offline shell, push |
| Backend | NestJS | 10+ | REST API, WebSocket, модули |
| Real-time | Socket.IO | 4+ | Батлы, матчмейкинг |
| ORM | Prisma | 5+ | Типобезопасный доступ к БД |
| DB | PostgreSQL | 16 | Основное хранилище |
| Cache | Redis | 7 | Сессии, матчмейкинг, rate limiting |
| AI | Claude API (Anthropic SDK) | latest | Сократические диалоги, генерация контента |
| Монорепо | Turborepo | latest | Оркестрация сборки |
| CDN | Cloudflare | — | Статика, защита |
| Хостинг | Selectel / Timeweb VPS | — | Docker Compose + nginx |
| Ошибки | Sentry | free tier | Error tracking |
| CI/CD | GitHub Actions | — | lint + typecheck + test |

---

## Структура монорепо

```
razum/
├── apps/
│   ├── web/                        # Next.js 14 PWA (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/             # Логин (Telegram, email)
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (main)/             # Основное приложение
│   │   │   │   ├── page.tsx        # Главная (разминка + батл + стрик)
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx    # Профиль + радар-чарт статов
│   │   │   │   ├── leaderboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx      # Общий layout с навигацией
│   │   │   ├── battle/
│   │   │   │   ├── new/page.tsx    # Создание/поиск батла
│   │   │   │   └── [id]/page.tsx   # Игровой экран батла
│   │   │   ├── learn/
│   │   │   │   ├── page.tsx        # Список веток и модулей
│   │   │   │   └── [moduleId]/
│   │   │   │       └── page.tsx    # Модуль: урок + квиз + AI-диалог
│   │   │   ├── admin/              # Админ-панель (защищена ролью)
│   │   │   │   ├── questions/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── api/                # Next.js API routes (только auth)
│   │   │       └── auth/[...nextauth]/route.ts
│   │   ├── components/
│   │   │   ├── battle/             # Компоненты батла
│   │   │   ├── learn/              # Компоненты обучения
│   │   │   ├── ui/                 # Общие UI-компоненты
│   │   │   └── layout/             # Header, Navigation, etc.
│   │   ├── hooks/                  # React hooks
│   │   ├── lib/                    # Утилиты, API-клиент, socket
│   │   ├── styles/                 # Глобальные стили, тема
│   │   └── public/
│   │       ├── manifest.json       # PWA манифест
│   │       ├── icons/              # PWA иконки
│   │       └── sw.js               # Service worker (Serwist)
│   │
│   └── api/                        # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/               # Аутентификация
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── guards/
│       │   │   └── strategies/     # Telegram, JWT
│       │   ├── user/               # Пользователи + статы
│       │   │   ├── user.module.ts
│       │   │   ├── user.controller.ts
│       │   │   └── user.service.ts
│       │   ├── battle/             # Батлы (ядро)
│       │   │   ├── battle.module.ts
│       │   │   ├── battle.controller.ts   # REST endpoints
│       │   │   ├── battle.service.ts      # Бизнес-логика
│       │   │   ├── battle.gateway.ts      # WebSocket gateway
│       │   │   ├── matchmaking.service.ts # Redis-очередь
│       │   │   └── bot.service.ts         # Бот-противник
│       │   ├── question/           # Вопросы + импорт
│       │   │   ├── question.module.ts
│       │   │   ├── question.controller.ts
│       │   │   └── question.service.ts
│       │   ├── learn/              # Модули обучения
│       │   │   ├── learn.module.ts
│       │   │   ├── learn.controller.ts
│       │   │   └── learn.service.ts
│       │   ├── ai/                 # AI-интеграция
│       │   │   ├── ai.module.ts
│       │   │   ├── ai.service.ts          # Claude API wrapper
│       │   │   ├── ai.controller.ts
│       │   │   └── prompts/
│       │   │       └── socratic-tutor.ts  # Системный промпт
│       │   ├── stats/              # Статистика + XP
│       │   │   ├── stats.module.ts
│       │   │   ├── stats.service.ts
│       │   │   └── warmup.service.ts      # Ежедневная разминка
│       │   ├── notification/       # Push-уведомления
│       │   │   ├── notification.module.ts
│       │   │   └── notification.service.ts
│       │   └── common/             # Общие: guards, filters, pipes
│       │       ├── filters/
│       │       ├── guards/
│       │       └── pipes/
│       └── test/                   # E2E тесты
│
├── packages/
│   └── shared/                     # Чистый TypeScript (без фреймворков)
│       ├── src/
│       │   ├── battle/
│       │   │   ├── state-machine.ts       # Стейт-машина батла
│       │   │   ├── scoring.ts             # Подсчёт очков
│       │   │   └── types.ts              # BattleState, Round, etc.
│       │   ├── stats/
│       │   │   ├── calculator.ts          # XP → Level, класс мыслителя
│       │   │   └── types.ts
│       │   ├── questions/
│       │   │   └── types.ts              # Question, Difficulty, Branch
│       │   └── constants.ts              # Общие константы
│       ├── __tests__/
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/
│   ├── schema.prisma                     # Схема БД
│   ├── migrations/                       # Миграции
│   └── seed.ts                           # Начальные данные
│
├── scripts/
│   └── generate-questions.ts             # AI-генерация вопросов (CLI)
│
├── docker-compose.yml                    # PostgreSQL + Redis
├── turbo.json                            # Turborepo конфиг
├── package.json                          # Root package.json
├── .eslintrc.js
├── .prettierrc
├── tsconfig.base.json
└── .github/
    └── workflows/
        └── ci.yml                        # CI: lint + typecheck + test
```

---

## Схема базы данных

### User
```sql
CREATE TABLE "User" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   BIGINT UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### UserStats
```sql
CREATE TABLE "UserStats" (
  user_id       UUID PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
  logic_xp      INT NOT NULL DEFAULT 0,
  erudition_xp  INT NOT NULL DEFAULT 0,
  strategy_xp   INT NOT NULL DEFAULT 0,
  rhetoric_xp   INT NOT NULL DEFAULT 0,
  intuition_xp  INT NOT NULL DEFAULT 0,
  rating        INT NOT NULL DEFAULT 1000,  -- ELO
  streak_days   INT NOT NULL DEFAULT 0,
  streak_date   DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Question
```sql
CREATE TABLE "Question" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,           -- 'first_principles', 'inversion', etc.
  branch          TEXT NOT NULL,           -- 'strategy' | 'logic'
  difficulty      TEXT NOT NULL,           -- 'bronze' | 'silver' | 'gold'
  text            TEXT NOT NULL,
  options         JSONB NOT NULL,          -- ["Option A", "Option B", "Option C", "Option D"]
  correct_index   SMALLINT NOT NULL,       -- 0-3
  explanation     TEXT NOT NULL,
  stat_primary    TEXT NOT NULL,           -- 'logic' | 'strategy' | etc.
  stat_secondary  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Battle
```sql
CREATE TABLE "Battle" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id      UUID NOT NULL REFERENCES "User"(id),
  player2_id      UUID REFERENCES "User"(id),  -- NULL = бот
  status          TEXT NOT NULL DEFAULT 'waiting',  -- waiting|active|completed|abandoned
  mode            TEXT NOT NULL DEFAULT 'siege',    -- siege|sparring
  category        TEXT,
  state           JSONB NOT NULL DEFAULT '{}',
  winner_id       UUID REFERENCES "User"(id),
  player1_score   INT NOT NULL DEFAULT 0,
  player2_score   INT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### BattleRound
```sql
CREATE TABLE "BattleRound" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id       UUID NOT NULL REFERENCES "Battle"(id) ON DELETE CASCADE,
  round_number    SMALLINT NOT NULL,
  attacker_id     UUID NOT NULL REFERENCES "User"(id),
  question_id     UUID NOT NULL REFERENCES "Question"(id),
  difficulty      TEXT NOT NULL,  -- bronze|silver|gold
  answer_index    SMALLINT,
  is_correct      BOOLEAN,
  defense_type    TEXT,           -- accept|dispute|counter
  time_taken_ms   INT,
  points          INT NOT NULL DEFAULT 0
);
```

### Module
```sql
CREATE TABLE "Module" (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch          TEXT NOT NULL,
  order_index     INT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  question_ids    UUID[] NOT NULL DEFAULT '{}'
);
```

### UserModuleProgress
```sql
CREATE TABLE "UserModuleProgress" (
  user_id             UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  module_id           UUID NOT NULL REFERENCES "Module"(id) ON DELETE CASCADE,
  completed_questions UUID[] NOT NULL DEFAULT '{}',
  completed_at        TIMESTAMPTZ,
  PRIMARY KEY (user_id, module_id)
);
```

### AiDialogue
```sql
CREATE TABLE "AiDialogue" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,
  messages      JSONB NOT NULL DEFAULT '[]',  -- [{role, content}]
  token_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## API Endpoints

### REST (NestJS Controllers)

```
AUTH
  POST   /auth/telegram              Telegram Login Widget
  POST   /auth/email/register        Регистрация по email
  POST   /auth/email/login           Вход по email
  POST   /auth/refresh               Обновление JWT

USER
  GET    /users/me                   Текущий пользователь + статы
  PATCH  /users/me                   Обновить профиль
  GET    /users/:id/profile          Публичный профиль

BATTLE
  POST   /battles                    Создать батл / встать в очередь
  GET    /battles/:id                Состояние батла (для реконнекта)
  GET    /battles/history            История батлов пользователя

QUESTION (admin)
  GET    /questions                  Список вопросов (фильтры: branch, difficulty)
  POST   /questions/bulk             Массовый импорт JSON
  PATCH  /questions/:id              Редактирование вопроса
  DELETE /questions/:id              Деактивация вопроса

LEARN
  GET    /modules?branch=            Список модулей по ветке
  GET    /modules/:id                Модуль с вопросами
  POST   /modules/:id/progress       Отметить вопрос как пройденный

AI
  POST   /ai/dialogue                Начать / продолжить диалог
  GET    /ai/dialogue/:id            История диалога
  GET    /ai/dialogues               Список диалогов пользователя

STATS
  GET    /warmup/today               Вопросы дневной разминки
  POST   /warmup/submit              Отправить ответы разминки
  GET    /leaderboard?type=&period=  Лидерборд
```

### WebSocket (Socket.IO, namespace /battle)

```
CLIENT → SERVER:
  battle:join        { battleId }
  battle:category    { category }
  battle:difficulty  { difficulty }
  battle:answer      { questionId, answerIndex }
  battle:defend      { defenseType: 'accept'|'dispute'|'counter' }

SERVER → CLIENT:
  battle:matched     { battleId, opponent }
  battle:round       { round, role, question?, timeLimit }
  battle:opponent_answered  {}
  battle:round_result      { scores, roundDetails }
  battle:complete    { winner, finalScores, xpGained, statsGained }
  battle:opponent_dc { timeoutSeconds }
  battle:error       { message, code }
```

---

## Батл-механика «Осада крепости» (1v1, 5-7 мин)

### Стейт-машина
```
WAITING → MATCHED → CATEGORY_SELECT → ROUND_ATTACK → ROUND_DEFENSE → ROUND_RESULT
  → SWAP_ROLES → ROUND_ATTACK → ... → FINAL_RESULT
```

### Раунды
1. **Выбор поля боя:** Оба видят 3 категории. Каждый банит 1, оставшаяся = поле боя
2. **Атака (раунды 1, 3):** Атакующий выбирает сложность удара:
   - Бронзовый (варианты ответа) = 1 очко урона
   - Серебряный (без вариантов) = 2 очка урона
   - Золотой (объясни ПОЧЕМУ) = до 3 очков урона
3. **Защита (раунды 2, 4):** Защищающийся может:
   - Принять (урон проходит)
   - Оспорить (контраргумент — AI судит → урон отражается)
   - Контратака (встречный вопрос — двойной урон обратно)
4. **Смена ролей** после каждой пары раундов
5. **Финал:** Сравнение HP. Победитель = больше урона нанёс

### Подсчёт очков
- Бронзовый правильный: +100 XP в stat_primary
- Серебряный правильный: +200 XP
- Золотой правильный: +350 XP
- Успешная защита (оспорить): +150 XP rhetoric
- Контратака успешная: +250 XP
- Победа в батле: +50 rating (ELO)
- Поражение: -25 rating

---

## AI-интеграция

### Сократический диалог — системный промпт
```
Ты — сократический наставник, помогающий ученику понять тему «{topic}».

Правила:
- НИКОГДА не давай прямого ответа или объяснения
- Задавай ОДИН наводящий вопрос за ответ
- Максимум 3 предложения на ответ
- Если ученик застрял 3 раза подряд — дай подсказку (не ответ)
- Используй примеры из {domain} для конкретности
- Отвечай на русском языке
- Когда ученик продемонстрировал понимание — подтверди и задай рефлексивный вопрос

Текущая тема: {topic}
Ветвь знаний: {branch}
Уровень ученика: {level}
```

### Контроль расходов
- **Модель диалогов:** Claude Haiku (~$0.01/запрос)
- **Модель генерации контента:** Claude Sonnet (~$0.05/запрос, офлайн)
- **Лимит free:** 1 диалог/день, макс 10 обменов, макс 2000 output tokens
- **Лимит PRO:** безлимит диалогов, макс 20 обменов
- **Кеширование:** частые открывающие вопросы по теме кешируются в Redis

---

## PWA-конфигурация

- **Display:** standalone (полноэкранный на мобильном)
- **Theme:** тёмная тема (#0a0a0a фон, акцентные цвета по веткам)
- **Offline:** app shell кешируется, интерактивные фичи требуют сети
- **Push:** Web Push API — утренняя разминка, вечерний вызов
- **Install prompt:** кастомный баннер после 3-го визита
- **Shortcuts:** «Разминка», «Батл» в манифесте
