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

## Сводка по неделям

### Неделя 1 (2026-04-05 — 2026-04-11)

| Дата | Кто | Что сделал | Задачи закрыты |
|------|-----|-----------|----------------|
| 04-05 | Никита | Scaffold + CI + pnpm + README | L1.1-L1.10 (все 10) |
| 04-05 | Бонди | Проверка фронтенда на 375px, все страницы ок | F1.9, F1.10 |
| 04-06 | Яшкин | Миграция, ConfigModule, exception filter, NestJS запуск | B1.3, B1.6, B1.9, B1.10 |
