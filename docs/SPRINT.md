# Текущий спринт — Неделя 1

**Дата начала:** 2026-04-05
**Цель недели:** Монорепо запускается, PostgreSQL и Redis в Docker, CI проходит, тёмная тема, пустые страницы отображаются.

---

## Руководитель (Lead)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| L1.1 | Создать Turborepo монорепо | done | `package.json`, `turbo.json` |
| L1.2 | Настроить tsconfig.base.json с strict mode | done | `tsconfig.base.json` |
| L1.3 | Настроить ESLint + Prettier | done | `.eslintrc.js`, `.prettierrc` |
| L1.4 | Создать docker-compose.yml | done | `docker-compose.yml` |
| L1.5 | Настроить GitHub Actions CI | done | `.github/workflows/ci.yml` |
| L1.6 | Инициализировать packages/shared | done | `packages/shared/` |
| L1.7 | Инициализировать git репозиторий | done | `.git/` |
| L1.8 | Подключить проект к GitHub | done | remote origin |
| L1.9 | Проверить pnpm install и pnpm dev | done | `pnpm-workspace.yaml` |
| L1.10 | Написать README с инструкцией по запуску | done | `README.md` |

---

## Бонди (Frontend + Дизайн)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F1.1 | Инициализировать Next.js 14 App Router | done | `apps/web/` |
| F1.2 | Настроить тёмную тему (CSS + Tailwind) | done | `apps/web/app/globals.css`, `tailwind.config.ts` |
| F1.3 | Создать root layout с метатегами | done | `apps/web/app/layout.tsx` |
| F1.4 | Создать main layout с нижней навигацией | done | `apps/web/app/(main)/layout.tsx` |
| F1.5 | Настроить PWA manifest | done | `apps/web/public/manifest.json` |
| F1.6 | Настроить Serwist service worker | done | `apps/web/app/sw.ts` |
| F1.7 | Создать UI-компоненты: Button, Card | done | `apps/web/components/ui/` |
| F1.8 | Создать BottomNav компонент | done | `apps/web/components/layout/BottomNav.tsx` |
| F1.9 | Проверить отображение на 375px | done | — |
| F1.10 | Убедиться, что все страницы рендерятся без ошибок | done | — |

---

## Разр��ботчик 2 (Backend)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B1.1 | Инициализировать NestJS 10 | done | `apps/api/` |
| B1.2 | Создать Prisma схему (User, UserStats) | done | `prisma/schema.prisma` |
| B1.3 | Выполнить первую миграцию | done | `prisma/migrations/` |
| B1.4 | Создать PrismaModule + PrismaService | done | `apps/api/src/prisma/` |
| B1.5 | Создать RedisModule + RedisService | done | `apps/api/src/redis/` |
| B1.6 | Настроить ConfigModule с .env | done | `apps/api/src/app.module.ts`, `apps/api/src/config/env.validation.ts` |
| B1.7 | Создать JwtAuthGuard | done | `apps/api/src/auth/guards/` |
| B1.8 | Создать AdminGuard | done | `apps/api/src/common/guards/` |
| B1.9 | Создать глобальный exception filter | done | `apps/api/src/common/filters/http-exception.filter.ts` |
| B1.10 | Проверить, что NestJS стартует без ошибок | done | — |

---

## Следующий спринт �� Неделя 2

**Цель:** Auth работает (Telegram + email), стейт-машина батла покрыта тестами.

### Lead
- Стейт-машина батла: `packages/shared/src/battle/state-machine.ts` (done — проверить и доработать)
- Модуль скоринга: `packages/shared/src/battle/scoring.ts` (done — проверить)
- Unit-тесты: 20+ тестов (done — проверить покрытие)
- Code review всех PR

### Разработ��ик 1
- Страница логина: `apps/web/app/(auth)/login/page.tsx`
- NextAuth.js v5: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Хук useAuth: `apps/web/hooks/useAuth.ts`
- Middleware: `apps/web/middleware.ts`

### Яшкин
- AuthModule: `apps/api/src/auth/`
- POST /auth/telegram, POST /auth/register, POST /auth/login, POST /auth/refresh
- JWT strategy + Telegram strategy
- UserModule: GET /users/me, PATCH /users/me
- Добавить таблицы Question, Battle, BattleRound в Prisma → миграция

# Текущие задачи Бонди (Frontend + Дизайн)

## Неделя 4

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F4.1 | Дополнить экран баттла: защита (иконки), анимация результата раунда, финальный экран (корона/щит, glow, рейтинг) | done | `apps/web/app/(main)/battle/[id]/page.tsx`, `apps/web/app/globals.css` |
| F4.2 | Страница профиля: RadarChart 5 статов, XP прогресс-бар, статистика баттлов, стрик, 10 последних баттлов | done | `apps/web/app/(main)/profile/page.tsx` |
| F4.3 | Кнопка «Найти соперника»: пульсирующие кольца поиска, экран VS перед стартом, ошибка без авторизации | done | `apps/web/app/(main)/battle/new/page.tsx`, `apps/web/hooks/useBattle.ts` |

---

# Текущие задачи Яшкина (Backend)

## Неделя 4

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B4.1 | StatsModule — начисление XP, формула уровня | done | `apps/api/src/stats/stats.module.ts` |
| B4.2 | Расширить GET /users/me — статы, уровень, история батлов | done | `apps/api/src/user/` |
| B4.3 | GET /users/:id/profile — публичный профиль | done | `apps/api/src/user/` |
| B4.4 | Скрипт генерации вопросов через Claude API | done | `scripts/generate-questions.ts` |
| B4.5 | Сгенерировать и проверить 200 вопросов (Стратегия + Логика) | done | `scripts/output/` |
| B4.6 | Обновить prisma/seed.ts для загрузки 200 вопросов | done | `prisma/seed.ts` |

## Ядро контента — RAG-пайплайн и генерация (Backend)

| # | Задача | Статус | Файлы | Блокер |
|---|--------|--------|-------|--------|
| BC1 | pgvector миграция + таблица `knowledge_chunks` | done | `prisma/schema.prisma`, миграция | — |
| BC2 | `scripts/process-content.ts` — парсинг PDF/txt, очистка от мусора | todo | `scripts/process-content.ts` | — |
| BC3 | `scripts/extract-concepts.ts` — извлечение концептов через Haiku | todo | `scripts/extract-concepts.ts` | BC2, LC4 |
| BC4 | `scripts/embed-content.ts` — генерация эмбеддингов, запись в pgvector | todo | `scripts/embed-content.ts` | BC1, BC3 |
| BC5 | KnowledgeService — поиск по векторной базе (similarity search) | todo | `apps/api/src/knowledge/` | BC4 |
| BC6 | Обновить `generate-questions.ts` — батч-генерация по таксономии с антидубль-проверкой | todo | `scripts/generate-questions.ts` | LC1, LC3 |
| BC7 | Адаптивная генерация — QuestionService.getForBattle() с fallback на AI | todo | `apps/api/src/question/question.service.ts` | BC5, LC4 |
| BC8 | Система обратной связи — лайк/дизлайк/репорт на вопросы + авто-ревью | todo | `apps/api/src/question/` | — |
| BC9 | Автоматическая адаптация сложности по статистике ответов | todo | `apps/api/src/question/`, `apps/api/src/stats/` | BC8 |

---

# Текущие задачи Никиты (Lead)

## Неделя 4 (основные)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| L4.1 | Redis-матчмейкинг (±100 рейтинга, расширение, таймаут 30 сек → бот) | done | `apps/api/src/battle/matchmaking.service.ts` |
| L4.2 | Подключить матчмейкинг к WebSocket gateway | done | `apps/api/src/battle/battle.gateway.ts` |
| L4.3 | Обработка дисконнектов (>30 сек = авто-поражение) | done | `apps/api/src/battle/battle.gateway.ts` |
| L4.4 | Docker Compose production + nginx + SSL | done | `docker-compose.prod.yml`, `nginx/` |
| L4.5 | Тестирование с 5-10 реальными людьми | todo | — |

## Досрочные задачи (из недель 5-8)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| L5.1 | E2E тест батла (полный цикл) | done | `apps/api/test/battle.e2e-spec.ts` |
| L6.1 | AI сократический промпт | done | → выполнено в LC5 |
| L6.2 | AI service — реальная интеграция Claude API | done | → выполнено в LC4 |
| L7.1 | WarmupService (5 вопросов + стрик) | done | `apps/api/src/warmup/` |

## Ядро контента — Таксономия и AI-генерация (Lead)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| LC1 | Создать полную таксономию знаний (Стратегия + Логика, все подветки, темы, подтемы) | done | `content/taxonomy.json`, `content/categories/` |
| LC2 | Архитектура RAG-пайплайна (структура content/, форматы, flow) | done | `content/README.md`, `content/sources/` |
| LC3 | Промпт для батч-генерации вопросов по таксономии (антидубли, уровни, примеры) | done | `apps/api/src/ai/prompts/question-generator.ts` |
| LC4 | AI service — реальная интеграция Claude API (L6.2) | done | `apps/api/src/ai/ai.service.ts` |
| LC5 | AI сократический промпт для обучения (L6.1) | done | `apps/api/src/ai/prompts/socratic-tutor.ts` |
| LC6 | Обработать транскрипты Маркаряна → structured JSON (первый блогерский источник) | done | `content/sources/bloggers/markaryan/concepts.json` |
| LC7 | Ревью и валидация первого батча 2000 вопросов | todo | — |
| LC8 | Система контроля качества вопросов (автопроверки, правила валидации) | done | `packages/shared/src/content/validation.ts` |

## Новые задачи — Инфраструктура и безопасность

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N1 | Swagger/OpenAPI документация для всего API | done | все controllers |
| N2 | Health-check эндпоинты (/health, /ready) | done | `apps/api/src/health/` |
| N3 | Rate limiting (глобальный + per-endpoint) | done | `apps/api/src/common/decorators/throttle.decorator.ts` |
| N4 | Security headers (CSP, HSTS, X-Frame-Options) | done | `apps/api/src/main.ts`, `nginx/nginx.conf` |
| N5 | API versioning (/v1/) | todo | `apps/api/src/` |

## Новые задачи — Пользовательский опыт

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N6 | Онбординг-флоу для нового пользователя | todo | `apps/web/app/(main)/onboarding/` |
| N7 | Система достижений (achievements) | todo | `prisma/schema.prisma`, `apps/api/src/achievements/` |
| N8 | Страницы ошибок (404, 500, offline) | todo | `apps/web/app/not-found.tsx`, `apps/web/app/error.tsx` |
| N9 | Telegram-бот для уведомлений и инвайтов | todo | `apps/bot/` |
| N10 | Система реферальных кодов | todo | `apps/api/src/referral/` |

## Новые задачи — Аналитика и мониторинг

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N11 | Event tracking (батлы, ответы, сессии) | todo | `apps/api/src/analytics/` |
| N12 | Дашборд PO — статистика в реальном времени | todo | `apps/web/app/admin/dashboard/` |
| N13 | Структурированные логи (Pino) | done | `nestjs-pino` в `app.module.ts` |

## Новые задачи — Контент и игровые механики

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N14 | Система ежедневных челленджей | todo | `apps/api/src/challenge/` |
| N15 | «Факт дня» на главном экране | todo | `apps/api/src/facts/`, `apps/web/components/` |
| N16 | Звуковые эффекты для батлов (Web Audio API) | todo | `apps/web/lib/sounds.ts` |

## Новые задачи — DevOps

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N17 | Скрипт автоматического бэкапа БД | done | `scripts/backup.sh` |
| N18 | Seed-скрипт для demo-режима (для инвесторов) | done | `prisma/seed-demo.ts` |
| NX.1 | Dockerfile для apps/api | done | `apps/api/Dockerfile` |
| NX.2 | Dockerfile для apps/web | done | `apps/web/Dockerfile` |

---

# Завершённый спринт — Неделя 3

**Дата начала:** 2026-04-07
**Цель недели:** Батл с ботом работает через WebSocket. Вопросы отображаются. Таймер работает.

## Руководитель (Lead / Никита)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| L3.1 | Создать WebSocket gateway (JWT auth, комнаты, события) | done | `apps/api/src/battle/battle.gateway.ts` |
| L3.2 | Создать BattleService (стейт-машина, таймеры, DB) | done | `apps/api/src/battle/battle.service.ts` |
| L3.3 | Создать бот-противника (60% accuracy, задержки) | done | `apps/api/src/battle/bot.service.ts` |
| L3.4 | Создать BattleController (REST endpoints) | done | `apps/api/src/battle/battle.controller.ts` |

## Бонди (Frontend + Дизайн)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F3.1 | Создать Socket.IO клиент с JWT | done | `apps/web/lib/socket.ts` |
| F3.2 | Создать хук useBattle | done | `apps/web/hooks/useBattle.ts` |
| F3.3 | Создать страницу поиска батла | done | `apps/web/app/(main)/battle/new/page.tsx` |
| F3.4 | Создать экран батла (категории, атака, таймер) | done | `apps/web/app/(main)/battle/[id]/page.tsx` |

## Яшкин (Backend)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B3.1 | QuestionModule (GET/POST/PATCH) | done | `apps/api/src/question/` |
| B3.2 | QuestionService.getRandomForBattle() | done | `apps/api/src/question/question.service.ts` |
| B3.3 | Seed 50 тестовых вопросов | done | `prisma/seed.ts` |
| B3.4 | RolesGuard для admin-эндпоинтов | done | `apps/api/src/common/guards/` |

---

# Завершённый спринт — Неделя 2

**Дата начала:** 2026-04-06
**Цель недели:** Auth работает (Telegram + email), стейт-машина батла покрыта тестами, 41 unit-тест.

---

## Руководитель (Lead / Никита)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| L2.1 | Проверить и доработать стейт-машину батла | done | `packages/shared/src/battle/state-machine.ts` |
| L2.2 | Проверить и доработать скоринг | done | `packages/shared/src/battle/scoring.ts` |
| L2.3 | Проверить и доработать типы батла | done | `packages/shared/src/battle/types.ts` |
| L2.4 | Добавить edge-case тесты (таймаут, дисконнект) до 30+ тестов | done | `packages/shared/__tests__/battle/state-machine.test.ts` |
| L2.5 | Code review всех PR недели | todo | — |

## Бонди (Frontend + Дизайн)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F2.1 | Создать страницу логина (Telegram + email) | done | `apps/web/app/(auth)/login/page.tsx` |
| F2.2 | Создать layout авторизации | done | `apps/web/app/(auth)/layout.tsx` |
| F2.3 | Подключить NextAuth.js v5 | done | `apps/web/app/api/auth/[...nextauth]/route.ts` |
| F2.4 | Создать хук useAuth | done | `apps/web/hooks/useAuth.ts` |
| F2.5 | Защитить маршруты middleware | blocked | `apps/web/middleware.ts` — блокирует без Telegram auth |

## Яшкин (Backend)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B2.1 | Создать AuthModule | done | `apps/api/src/auth/auth.module.ts` |
| B2.2 | Написать auth.controller (telegram, register, login, refresh) | done | `apps/api/src/auth/auth.controller.ts` |
| B2.3 | Написать auth.service (валидация, JWT) | done | `apps/api/src/auth/auth.service.ts` |
| B2.4 | Создать JWT strategy | done | `apps/api/src/auth/strategies/jwt.strategy.ts` |
| B2.5 | Создать Telegram strategy | done | `apps/api/src/auth/strategies/telegram.strategy.ts` |
| B2.6 | Создать UserModule (GET /users/me, PATCH /users/me) | done | `apps/api/src/user/` |
| B2.7 | Добавить таблицы Question, Battle, BattleRound в Prisma → миграция | done | `prisma/schema.prisma` |

---

## Как пользоваться

При входе в проект скажи кто ты:
- **«Я Никита»** или **«Lead»** — получишь задачи руководителя
- **«Я Бонди»** или **«Frontend»** — получишь задачи фронтенда + дизайна
- **«Я Яшкин»** или **«Backend»** — получишь задачи бэкенда

Claude прочитает этот файл и выдаст:
1. Твои текущие задачи со статусами
2. Что нужно сделать прямо сейчас
3. От кого ты зависишь (блокеры)
4. Файлы, которые нужно создать/изменить
