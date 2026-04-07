# РАЗУМ — Журнал работы команды

> Этот файл обновляется автоматически после каждой рабочей сессии.
> Спроси «Что сделал Бонди?» или «Покажи работу за неделю» — Claude найдёт нужное.

---

## Никита (Lead)

### 2026-04-05 — Сессия 1: Инициализация проекта

**Время:** ~3 часа
**Статус:** Завершена

**Что сделано:**
- Создан полный scaffold монорепо (Turborepo): 88 файлов
- Настроен стек: Next.js 14 + NestJS + PostgreSQL + Redis + Socket.IO
- Написана стейт-машина батла (`packages/shared/src/battle/state-machine.ts`) — 29 тестов
- Создана система скоринга + ELO рейтинг (`packages/shared/src/battle/scoring.ts`)
- Создана Prisma-схема: 8 таблиц, 6 enum'ов, seed с 20 вопросами на русском
- Настроен Docker Compose (PostgreSQL 16 + Redis 7)
- Создана полная документация: ARCHITECTURE.md, ROADMAP.md, TASKS.md, SPRINT.md
- Создана система управления задачами через CLAUDE.md
- Git init + push на GitHub (github.com/kireevkit15-sys/-1)

**Файлы созданы/изменены:**
- `package.json`, `turbo.json`, `tsconfig.base.json`, `.eslintrc.js`, `.prettierrc`
- `docker-compose.yml`, `.env.example`, `.gitignore`
- `CLAUDE.md`
- `apps/web/` — 19 файлов (Next.js PWA scaffold)
- `apps/api/` — 38 файлов (NestJS backend scaffold)
- `packages/shared/` — 12 файлов (батл-логика + тесты)
- `prisma/` — schema.prisma, seed.ts
- `docs/` — ARCHITECTURE.md, ROADMAP.md, TASKS.md, SPRINT.md

**Задачи из SPRINT.md закрыты:** L1.1, L1.2, L1.3, L1.4, L1.6, L1.7, L1.8

**Коммиты:**
- `19de206` — feat: initial project scaffold — РАЗУМ MVP
- `2e42d38` — chore: update team names — Бонди (Frontend+Design), Яшкин (Backend)

---

### 2026-04-05 — Сессия 2: Закрытие недели 1

**Время:** ~1 час
**Статус:** Завершена

**Что сделано:**
- Настроен GitHub Actions CI: lint, typecheck, test на каждый push/PR
- Переведён проект на pnpm workspace (pnpm-workspace.yaml)
- Проверен pnpm install — все зависимости установлены
- Проверены тесты — 29/29 pass, shared package собирается
- Написан README с инструкцией по быстрому старту
- Добавлена система WORKLOG + обязательный git pull/push
- Все 10 задач Lead на неделю 1 закрыты

**Файлы созданы/изменены:**
- `.github/workflows/ci.yml` — CI pipeline
- `pnpm-workspace.yaml` — pnpm workspaces
- `package.json` — переключен на pnpm
- `README.md` — инструкция по запуску
- `docs/WORKLOG.md` — журнал работы
- `CLAUDE.md` — правила синхронизации и логирования

**Задачи из SPRINT.md закрыты:** L1.5, L1.7, L1.8, L1.9, L1.10

**Коммиты:**
- `440f1b1` — chore: add mandatory git pull on session start
- `e358659` — feat(ci): add GitHub Actions CI pipeline
- `ed4c0f6` — chore(infra): switch to pnpm workspace
- `15ac8a3` — docs: add README with quick start guide

---

## Бонди (Frontend + Дизайн)

### 2026-04-05 — Сессия 1: Проверка фронтенда на мобильных

**Время:** ~1 час
**Статус:** Завершена

**Что сделано:**
- Установлены зависимости (npm install), запущен dev-сервер
- Проверено отображение всех страниц на 375px (iPhone SE): Главная, Батл, Обучение, Профиль
- Убедились что все страницы рендерятся без ошибок в консоли
- Обзор текущего состояния фронтенда и планирование дизайн-направления

**Файлы изменены:**
- `docs/SPRINT.md` — F1.9 и F1.10 отмечены как done

**Задачи из SPRINT.md закрыты:** F1.9, F1.10

**Коммиты:**
- `507119d` — chore(sprint): mark F1.9 and F1.10 as done

### 2026-04-06 — Сессия 2: Dark Academia дизайн-система + Liquid Glass

**Время:** ~4 часа
**Статус:** Завершена

**Что сделано:**
- Утверждена палитра Dark Academia (медный #CF9D7B, тёплые тёмные фоны #0C1519)
- Создан Figma-плагин для генерации макетов (figma-plugin/code.js + manifest.json)
- Перенесён дизайн на все 12 файлов фронтенда — полная замена цветовой палитры
- Убраны ВСЕ эмодзи со всех страниц — заменены на SVG-иконки (пазл, компьютер, лупа, шапочка, замок)
- Реализован Liquid Glass эффект для BottomNav (овальная капсула + отдельный орб профиля)
- Исправлен критический баг: динамические Tailwind-классы не компилировались (battle, learn)
- Добавлена глубина карточкам (тени + inset highlight)
- Исправлен layout: max-w-lg→max-w-md для 375px экранов
- Удалён middleware (блокировал без .env)
- Safe area padding на всех страницах для iPhone с чёлкой

**Файлы созданы/изменены:**
- `apps/web/tailwind.config.ts` — новая палитра Dark Academia
- `apps/web/app/globals.css` — Liquid Glass CSS, ::selection, бордеры
- `apps/web/components/ui/Button.tsx` — медные варианты
- `apps/web/components/ui/Card.tsx` — глубина + тёплые бордеры
- `apps/web/components/layout/BottomNav.tsx` — Liquid Glass навигация
- `apps/web/app/(main)/page.tsx` — полная переработка главной
- `apps/web/app/(main)/battle/new/page.tsx` — SVG-иконки, лупа, медные кнопки
- `apps/web/app/(main)/battle/[id]/page.tsx` — статические классы, без эмодзи
- `apps/web/app/(main)/learn/page.tsx` — colorMap, SVG-замки
- `apps/web/app/(main)/profile/page.tsx` — инициалы, фикс Эрудиции
- `apps/web/app/(auth)/login/page.tsx` — тёплые токены, focus ring
- `figma-plugin/` — плагин для макетов

**Задачи из SPRINT.md закрыты:** F1.2 (переработка)

**Коммиты:**
- `785883d` — feat(web): apply Dark Academia design system
- `706f160` — fix(web): Liquid Glass nav, fix dynamic classes, card depth

### 2026-04-06 — Сессия 3: Неделя 3 — Socket.IO, баттл UI, DifficultyPicker

**Время:** ~4 часа
**Статус:** Завершена

**Что сделано:**
- Создан Socket.IO клиент (`apps/web/lib/socket.ts`) — подключение к /battle namespace с JWT, автореконнект
- Создан хук useBattle (`apps/web/hooks/useBattle.ts`) — reducer, подписка на все WS-события, экшены
- Переписана страница поиска баттла с реальным хуком useBattle (createBotBattle, searchOpponent, cancelSearch)
- Переписан экран баттла — все фазы: CATEGORY_SELECT, ROUND_ATTACK, ROUND_DEFENSE, ROUND_RESULT, FINAL_RESULT
- Создана демо-страница `/battle/demo` — полный интерактивный баттл без бэкенда
- Создан компонент DifficultyPicker — карусель с бесконечным свайпом, liquid-glass карточки
- Добавлены HP-бары (градиентные полоски здоровья) в ScoreBar
- Круговой таймер (TimerCircle) — 60 сек, краснеет при <10 сек
- Исправлено: "батл" → "баттл" во всех 8 файлах
- Исправлен критический баг: сокет убивался при навигации между страницами
- Исправлено: [id]/page.tsx теперь читает URL-параметры и запрашивает battle:join
- Добавлен цвет accent-bronze, accent-silver в tailwind.config.ts
- Добавлены CSS-классы tier-bronze/silver/gold в globals.css
- Категории получили разные цвета (красный/золотой/медный)

**Файлы созданы:**
- `apps/web/lib/socket.ts` — Socket.IO клиент
- `apps/web/hooks/useBattle.ts` — хук баттла
- `apps/web/app/(main)/battle/demo/page.tsx` — демо-режим
- `apps/web/components/battle/DifficultyPicker.tsx` — карусель выбора сложности
- `apps/web/public/images/` — шахматные фигуры (knight, rook, queen)

**Файлы изменены:**
- `apps/web/app/(main)/battle/new/page.tsx` — реальный useBattle
- `apps/web/app/(main)/battle/[id]/page.tsx` — useParams + все фазы
- `apps/web/app/(main)/page.tsx` — "баттл"
- `apps/web/app/layout.tsx` — "баттл"
- `apps/web/components/layout/BottomNav.tsx` — "Баттл"
- `apps/web/app/(main)/profile/page.tsx` — "баттлов"
- `apps/web/public/manifest.json` — "баттл"
- `apps/web/app/globals.css` — tier-классы
- `apps/web/tailwind.config.ts` — accent-bronze, accent-silver

**Задачи из SPRINT.md закрыты:** F3.1, F3.2, F3.3, F3.4

### 2026-04-07 — Сессия 4: Неделя 4 — анимации баттла, профиль, поиск соперника

**Время:** ~3 часа
**Статус:** Завершена

**Что сделано:**
- F4.1: Дополнен экран баттла — SVG-иконки защиты (щит/меч/X), slam-анимация урона в ROUND_RESULT, каскадные карточки статов, финальный экран с короной/щитом + glow-эффект + карточка изменения рейтинга
- F4.2: Полностью переписана страница профиля — Recharts RadarChart (5 осей), XP прогресс-бар до следующего уровня, сетка статистики (баттлы/побед/винрейт), серия дней со стриком, 10 последних баттлов
- F4.3: Улучшена анимация поиска (3 пульсирующих кольца вместо ping), добавлен промежуточный экран "VS" с аватарами и полоской загрузки 2.5 сек перед редиректом
- Исправлены баги: бейдж рейтинга ("R" → иконка тренда), иконка огня стрика, немое игнорирование кнопок без авторизации → теперь показывается ошибка
- CSS-анимации: battle-slam, battle-fade-up, battle-scale-in, battle-glow-gold/red, battle-stagger-1..4, battle-load-bar
- Синхронизирована демо-страница `/battle/demo` с новыми анимациями

**Файлы изменены:**
- `apps/web/app/(main)/battle/[id]/page.tsx` — защита + результат раунда + финал
- `apps/web/app/(main)/battle/demo/page.tsx` — синхронизация анимаций
- `apps/web/app/(main)/battle/new/page.tsx` — поиск + VS экран
- `apps/web/app/(main)/profile/page.tsx` — полная переработка профиля
- `apps/web/app/globals.css` — 6 CSS-анимаций
- `apps/web/hooks/useBattle.ts` — ошибка при отсутствии авторизации

**Задачи из SPRINT.md закрыты:** F4.1, F4.2, F4.3

**Коммиты:**
- `86593f9` — feat(web): week 4 — battle animations, profile RadarChart, matchmaking UI

---

## Яшкин (Backend)

### 2026-04-06 — Сессия 1: Первая миграция, ConfigModule, exception filter, запуск NestJS

**Время:** ~2 часа
**Статус:** Завершена

**Что сделано:**
- Установлен Docker Desktop, Node.js 24, pnpm
- Запущены PostgreSQL 16 + Redis 7 через Docker Compose
- Создан `.env` с корректным DATABASE_URL (совпадает с docker-compose.yml)
- Выполнена первая миграция Prisma — 8 таблиц, 6 enum'ов в PostgreSQL
- Установлен prisma@5 + @prisma/client@5 (совместимость со схемой)
- Настроен ConfigModule: envFilePath на корень проекта + валидация (DATABASE_URL, JWT_SECRET обязательны)
- Создан глобальный AllExceptionsFilter с единым JSON-форматом ошибок
- Исправлены все TS-ошибки компиляции (16 шт.): несовпадение полей Prisma-схемы с кодом, типизация
- NestJS успешно стартует на http://localhost:3001 — 0 ошибок

**Файлы созданы/изменены:**
- `prisma/migrations/20260405223926_init/migration.sql` — первая миграция
- `apps/api/src/config/env.validation.ts` — валидация env
- `apps/api/src/common/filters/http-exception.filter.ts` — exception filter
- `apps/api/src/app.module.ts` — подключение валидации и envFilePath
- `apps/api/src/main.ts` — подключение exception filter
- `apps/api/tsconfig.json` — rootDir для shared package
- `apps/api/nest-cli.json` — entryFile для нового rootDir
- `apps/api/src/auth/auth.service.ts` — password→passwordHash, telegramId BigInt
- `apps/api/src/battle/battle.service.ts` — Prisma.InputJsonValue cast
- `apps/api/src/battle/battle.controller.ts` — исправлены сигнатуры методов
- `apps/api/src/battle/battle.gateway.ts` — исправлены вызовы BotService
- `apps/api/src/question/question.service.ts` — correctIndex, branch, statPrimary
- `apps/api/src/question/dto/create-question.dto.ts` — BRONZE/SILVER/GOLD enum
- `apps/api/src/learn/learn.service.ts` — Difficulty cast
- `apps/api/src/stats/stats.service.ts` — запросы через UserStats
- `apps/api/src/user/user.service.ts` — passwordHash, avatarUrl
- `apps/api/src/redis/redis.service.ts` — исправлена типизация ConfigService
- `package.json` — prisma + @prisma/client@5.22.0

**Задачи из SPRINT.md закрыты:** B1.3, B1.6, B1.9, B1.10

**Коммиты:**
- `c7a8bd4` — feat(db): run first Prisma migration — create all tables
- `9ffddd8` — feat(config): add env validation and fix envFilePath to project root
- `ae6e7b9` — feat(api): add exception filter, fix env config, fix all TS errors — NestJS starts clean

---

### 2026-04-06 — Сессия 2: Auth module, JWT, Swagger

**Время:** ~1.5 часа
**Статус:** Завершена

**Что сделано:**
- Переработан AuthModule: добавлены PassportModule, PrismaModule
- Созданы JwtStrategy и JwtRefreshStrategy (passport-jwt)
- Добавлена поддержка refresh tokens (отдельный секрет, 30 дней TTL)
- Добавлен POST /auth/refresh эндпоинт с JwtRefreshGuard
- Авто-создание UserStats при регистрации и Telegram-логине
- Подключён Swagger UI на /docs с ApiTags и ApiOperation
- Добавлен корневой GET / с информацией об API
- Обновлён .gitignore (исключены build-артефакты shared)
- Все эндпоинты проверены: register, login, refresh, /users/me

**Файлы созданы/изменены:**
- `apps/api/src/auth/strategies/jwt.strategy.ts` — JWT Passport strategy
- `apps/api/src/auth/strategies/jwt-refresh.strategy.ts` — Refresh strategy
- `apps/api/src/auth/strategies/telegram.strategy.ts` — Telegram auth docs
- `apps/api/src/auth/guards/jwt-auth.guard.ts` — переделан на Passport
- `apps/api/src/auth/guards/jwt-refresh.guard.ts` — guard для refresh
- `apps/api/src/auth/auth.module.ts` — PassportModule, PrismaModule, стратегии
- `apps/api/src/auth/auth.service.ts` — refresh tokens, auto UserStats
- `apps/api/src/auth/auth.controller.ts` — refresh endpoint, Swagger декораторы
- `apps/api/src/user/user.controller.ts` — Swagger декораторы
- `apps/api/src/app.controller.ts` — корневой GET /
- `apps/api/src/main.ts` — Swagger setup
- `.gitignore` — исключение shared build artifacts

**Задачи из SPRINT.md закрыты:** B2.1, B2.2, B2.3, B2.4, B2.5, B2.6, B2.7

**Коммиты:**
- `2baf0de` — feat(auth): complete Auth module — Passport JWT, refresh tokens, Swagger docs

---

### 2026-04-07 — Сессия 3: Неделя 5 — Модули обучения (Backend API)

**Время:** ~1.5 часа
**Статус:** Завершена

**Что сделано:**
- Переписан LearnService: getModules (с прогрессом и разблокировкой), getModuleById (с вопросами), submitProgress (отметка вопроса + автозавершение модуля)
- Переписан LearnController: GET /modules?branch=, GET /modules/:id, POST /modules/:id/progress
- Созданы DTO с class-validator и Swagger: GetModulesQueryDto, SubmitProgressDto
- Расширен seed: +6 вопросов (вероятностное мышление, принятие решений), +4 модуля до 10 всего (5 Стратегия + 5 Логика)
- Обновлён SPRINT.md: N11 → done, N19 → первоочередная для Lead

**Файлы созданы/изменены:**
- `apps/api/src/learn/learn.service.ts` — полная переработка
- `apps/api/src/learn/learn.controller.ts` — полная переработка
- `apps/api/src/learn/learn.module.ts` — упрощён
- `apps/api/src/learn/dto/get-modules-query.dto.ts` — новый
- `apps/api/src/learn/dto/submit-progress.dto.ts` — новый
- `prisma/seed.ts` — +6 вопросов, +4 модуля
- `docs/SPRINT.md` — обновлены статусы

**Задачи из SPRINT.md закрыты:** B5.1, B5.2, B5.3, B5.4, B5.5

**Коммиты:**
- `715675d` — feat(api): learning modules API — list, detail, progress tracking (Week 5)

---

### 2026-04-07 — Сессия 4: Аудит задач недель 8-12

**Время:** ~0.5 часа
**Статус:** Завершена

**Что сделано:**
- Перепроверены все задачи Яшкина (недели 8-12) по коммитам и реальному коду
- Подтверждено: 17 из 17 задач (недели 8-11) фактически выполнены в коде
- getSummary() в StatsService уже реализован и подключён как GET /stats/me/summary
- Добавлены недостающие секции недель 8-11 в SPRINT.md (B8.1-B8.4, B9.1-B9.4, B10.1-B10.3, B11.1-B11.4)
- Остаются незакрытыми: B12.7 (edge cases), B12.8 (production seed)

**Файлы изменены:**
- `docs/SPRINT.md` — добавлены секции недель 8-11 для Яшкина

**Задачи из SPRINT.md закрыты:** B8.1-B8.4, B9.1-B9.4, B10.1-B10.3, B11.1-B11.4

**Коммиты:**
- `1aa9272` — docs(sprint): add Яшкин weeks 8-11 tasks — all verified as done

---

## Сводка по неделям

### Неделя 1 (2026-04-05 — 2026-04-11)

| Дата | Кто | Что сделал | Задачи закрыты |
|------|-----|-----------|----------------|
| 04-05 | Никита | Scaffold + CI + pnpm + README | L1.1-L1.10 (все 10) |
| 04-05 | Бонди | Проверка фронтенда на 375px, все страницы ок | F1.9, F1.10 |
| 04-06 | Яшкин | Миграция, ConfigModule, exception filter, NestJS запуск | B1.3, B1.6, B1.9, B1.10 |
| 04-06 | Яшкин | Auth module, JWT strategies, refresh tokens, Swagger | B2.1-B2.7 (все 7) |
| 04-07 | Бонди | Анимации баттла, профиль RadarChart, поиск соперника | F4.1, F4.2, F4.3 |
| 04-07 | Яшкин | Модули обучения API: list, detail, progress, seed 10 модулей | B5.1-B5.5 (все 5) |
| 04-07 | Яшкин | Аудит задач: подтверждены недели 8-11, обновлён SPRINT.md | B8.1-B11.4 (15 задач) |
