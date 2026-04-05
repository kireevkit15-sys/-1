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
| F1.9 | Проверить отображение на 375px | todo | — |
| F1.10 | Убедиться, что все страницы рендерятся без ошибок | todo | — |

---

## Разр��ботчик 2 (Backend)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B1.1 | Инициализировать NestJS 10 | done | `apps/api/` |
| B1.2 | Создать Prisma схему (User, UserStats) | done | `prisma/schema.prisma` |
| B1.3 | Выполнить первую миграцию | todo | `prisma/migrations/` |
| B1.4 | Создать PrismaModule + PrismaService | done | `apps/api/src/prisma/` |
| B1.5 | Создать RedisModule + RedisService | done | `apps/api/src/redis/` |
| B1.6 | Настроить ConfigModule с .env | todo | `apps/api/src/app.module.ts` |
| B1.7 | Создать JwtAuthGuard | done | `apps/api/src/auth/guards/` |
| B1.8 | Создать AdminGuard | done | `apps/api/src/common/guards/` |
| B1.9 | Создать глобальный exception filter | todo | `apps/api/src/common/filters/` |
| B1.10 | Проверить, что NestJS стартует без ошибок | todo | — |

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

---

# Текущий спринт — Неделя 2

**Дата начала:** 2026-04-06
**Цель недели:** Auth работает (Telegram + email), стейт-машина батла покрыта тестами, 20+ unit-тестов.

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
| F2.1 | Создать страницу логина (Telegram + email) | todo | `apps/web/app/(auth)/login/page.tsx` |
| F2.2 | Создать layout авторизации | todo | `apps/web/app/(auth)/layout.tsx` |
| F2.3 | Подключить NextAuth.js v5 | todo | `apps/web/app/api/auth/[...nextauth]/route.ts` |
| F2.4 | Создать хук useAuth | todo | `apps/web/hooks/useAuth.ts` |
| F2.5 | Защитить маршруты middleware | todo | `apps/web/middleware.ts` |

## Яшкин (Backend)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B2.1 | Создать AuthModule | todo | `apps/api/src/auth/auth.module.ts` |
| B2.2 | Написать auth.controller (telegram, register, login, refresh) | todo | `apps/api/src/auth/auth.controller.ts` |
| B2.3 | Написать auth.service (валидация, JWT) | todo | `apps/api/src/auth/auth.service.ts` |
| B2.4 | Создать JWT strategy | todo | `apps/api/src/auth/strategies/jwt.strategy.ts` |
| B2.5 | Создать Telegram strategy | todo | `apps/api/src/auth/strategies/telegram.strategy.ts` |
| B2.6 | Создать UserModule (GET /users/me, PATCH /users/me) | todo | `apps/api/src/user/` |
| B2.7 | Добавить таблицы Question, Battle, BattleRound в Prisma → миграция | todo | `prisma/schema.prisma` |

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
