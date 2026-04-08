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

## Неделя 5 — Адаптив + Визуальный стиль "маскулинная агрессия"

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F5.1 | Адаптивный layout: SideNav (md:+) вместо BottomNav, контент max-w-3xl по центру, sidebar справа (статы, стрик, факт дня) | done | `apps/web/components/layout/SideNav.tsx`, `apps/web/components/layout/RightSidebar.tsx`, `apps/web/app/(main)/layout.tsx`, `apps/web/components/layout/BottomNav.tsx` |
| F5.2 | Keyboard shortcuts в батле: 1-2-3-4 для ответов, Enter подтверждение, Esc выход | done | `apps/web/app/(main)/battle/[id]/page.tsx` |
| F5.3 | Визуальный стиль: агрессивные accent-цвета (красный/оранжевый glow), sharp edges, micro-анимации при hover, металлический gradient на заголовках | todo | `apps/web/app/globals.css`, `tailwind.config.ts` |
| F5.4 | Батл-экран: shake-эффект при неправильном ответе, pulse при критическом HP, particle explosion при победе, звук удара | todo | `apps/web/app/(main)/battle/[id]/page.tsx`, `apps/web/lib/sounds.ts` |
| F5.5 | 5 веток — визуальная идентичность: каждая ветка свой цвет + иконка + glow-эффект (STRATEGY=cyan, LOGIC=green, ERUDITION=purple, RHETORIC=orange, INTUITION=pink) | todo | `apps/web/components/`, `apps/web/app/globals.css` |
| F5.6 | Профиль: RadarChart обновить на 5 статов, animated counter при прокачке, rank badge с glow | todo | `apps/web/app/(main)/profile/page.tsx` |
| F5.7 | Главный экран: hero-секция с аватаром + статами, daily challenge карточка с countdown таймером, aggressive CTA "В бой" | todo | `apps/web/app/(main)/page.tsx` |
| F5.8 | Тёмная тема v2: глубокий чёрный (#050505), subtle noise texture, неоновые акценты, glassmorphism на карточках | todo | `apps/web/app/globals.css`, `tailwind.config.ts` |
| F5.9 | Двухколоночный layout для модулей обучения (desktop), карточки с progress bar и иконкой ветки | todo | `apps/web/app/(main)/learn/page.tsx` |
| F5.10 | Hover-эффекты: все интерактивные элементы — scale + glow при наведении, smooth transitions 200ms | todo | `apps/web/components/ui/` |

## Блок 6 — Баттл UX

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F6.1 | Keyboard shortcuts: 1-2-3-4 ответы, Enter подтверждение, Esc выход | todo | `apps/web/app/(main)/battle/[id]/page.tsx` |
| F6.2 | Shake-эффект при неправильном ответе, pulse при критическом HP | todo | `apps/web/app/(main)/battle/[id]/page.tsx`, `apps/web/app/globals.css` |
| F6.3 | Particle explosion при победе (canvas или CSS) | todo | `apps/web/app/(main)/battle/[id]/page.tsx` |
| F6.4 | Экран выбора ветки атаки: 5 карточек с иконками + glow активной ветки | todo | `apps/web/app/(main)/battle/[id]/page.tsx` |
| F6.5 | Анимация получения XP: floating numbers +15 XP, прогресс-бар заполняется | todo | `apps/web/components/` |
| F6.6 | Экран VS: аватары с рангами, 5 статов каждого игрока, countdown 3-2-1 | todo | `apps/web/app/(main)/battle/new/page.tsx` |
| F6.7 | Результат раунда: анимированная разница очков, подсветка правильного ответа | todo | `apps/web/app/(main)/battle/[id]/page.tsx` |

## Блок 7 — Профиль и прогресс

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F7.1 | RadarChart обновить на 5 осей (5 веток), animated counter при прокачке | todo | `apps/web/app/(main)/profile/page.tsx` |
| F7.2 | Rank badge с glow эффектом (Стратег/Философ/Учёный/Командир/Мудрец/Визионер) | todo | `apps/web/components/` |
| F7.3 | История баттлов: карточки с результатом, ветками, изменением рейтинга | todo | `apps/web/app/(main)/profile/page.tsx` |
| F7.4 | Страница достижений: сетка бейджей, locked/unlocked, progress к следующему | todo | `apps/web/app/(main)/achievements/page.tsx` |
| F7.5 | Публичный профиль другого игрока (по ссылке) | todo | `apps/web/app/(main)/profile/[id]/page.tsx` |

## Блок 8 — Обучение

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F8.1 | Дерево знаний: визуальная карта 5 веток → 25 категорий, прогресс по каждой | todo | `apps/web/app/(main)/learn/page.tsx` |
| F8.2 | Двухколоночный layout модулей на desktop, карточки с progress bar и иконкой ветки | todo | `apps/web/app/(main)/learn/page.tsx` |
| F8.3 | Экран модуля: вопросы с анимацией перехода, прогресс сверху, результат в конце | todo | `apps/web/app/(main)/learn/[moduleId]/page.tsx` |
| F8.4 | AI-чат: расширенный layout на desktop, markdown рендер, code blocks | todo | `apps/web/app/(main)/chat/page.tsx` |
| F8.5 | Страница разминки: 5 вопросов, streak counter, мотивационное сообщение | todo | `apps/web/app/(main)/warmup/page.tsx` |

## Блок 9 — Главная и навигация

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F9.1 | Hero-секция: аватар + 5 статов мини-баром, уровень, класс мыслителя | todo | `apps/web/app/(main)/page.tsx` |
| F9.2 | Daily challenge карточка с countdown таймером | todo | `apps/web/app/(main)/page.tsx` |
| F9.3 | Факт дня: карточка с swipe to dismiss | todo | `apps/web/components/` |
| F9.4 | CTA кнопка "В бой" — aggressive стиль, пульсация, glow | todo | `apps/web/app/(main)/page.tsx` |
| F9.5 | Лидерборд: топ-20 с аватарами, позиция текущего игрока подсвечена | todo | `apps/web/app/(main)/leaderboard/page.tsx` |
| F9.6 | Онбординг v2: выбор 3 любимых веток, интро-баттл с ботом | todo | `apps/web/app/(main)/onboarding/page.tsx` |

## Блок 10 — PWA и мобайл

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F10.1 | Push-уведомления: подписка, UI разрешения, значок на иконке | todo | `apps/web/components/`, `apps/web/lib/push.ts` |
| F10.2 | Offline-режим: cached страницы, offline fallback с кешированными вопросами | todo | `apps/web/app/sw.ts` |
| F10.3 | Install prompt: кастомный баннер "Установи РАЗУМ" | todo | `apps/web/components/` |
| F10.4 | Splash screen при запуске PWA | todo | `apps/web/public/` |
| F10.5 | Swipe-жесты: свайп между вкладками, pull-to-refresh | todo | `apps/web/components/layout/` |

## Блок 11 — Полировка и допфичи

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| F11.1 | Анимация перехода между страницами: slide/fade transitions (Framer Motion / View Transitions API) | todo | `apps/web/app/` |
| F11.2 | Skeleton loading: shimmer-эффект на все карточки, профиль, лидерборд | todo | `apps/web/components/ui/Skeleton.tsx` |
| F11.3 | Toast-уведомления: XP получен, ачивка разблокирована, стрик продлён | todo | `apps/web/components/ui/Toast.tsx` |
| F11.4 | Confetti / particles при level up, новый ранг, разблокировке ачивки | todo | `apps/web/lib/confetti.ts` |
| F11.5 | Настройки пользователя: звук вкл/выкл, уведомления | todo | `apps/web/app/(main)/settings/page.tsx` |
| F11.6 | Share-кнопка: поделиться результатом баттла (OG-image) в Telegram/VK | todo | `apps/web/app/api/og/` |
| F11.7 | Реферальная страница: ввод кода, бонус, список приглашённых | todo | `apps/web/app/(main)/referral/page.tsx` |
| F11.8 | Страница ошибки сети: красивый UI при потере соединения с retry-кнопкой | todo | `apps/web/components/` |
| F11.9 | Дизайн empty states: нет баттлов, нет достижений, нет истории — мотивационные экраны | todo | `apps/web/components/` |
| F11.10 | Micro-interactions: иконка батла вибрирует при новом challenge, бейдж bounce | todo | `apps/web/components/` |
| F11.11 | Тёмный/светлый toggle (подготовка к светлой теме) | todo | `apps/web/app/` |
| F11.12 | Страница "О проекте": миссия, команда, контакты | todo | `apps/web/app/(main)/about/page.tsx` |

## Тестирование Бонди

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| FT.1 | Визуальное регрессионное тестирование: Playwright screenshots на 375/390/414/768/1024/1440px | todo | `apps/web/tests/visual/` |
| FT.2 | E2E тест: полный флоу баттла — В бой → поиск → VS → 5 раундов → результат → профиль | todo | `apps/web/tests/e2e/battle.spec.ts` |
| FT.3 | E2E тест: онбординг → регистрация → первый баттл с ботом | todo | `apps/web/tests/e2e/onboarding.spec.ts` |
| FT.4 | E2E тест: обучение → модуль → 5 вопросов → прогресс обновился | todo | `apps/web/tests/e2e/learn.spec.ts` |
| FT.5 | E2E тест: разминка → 5 вопросов → стрик +1 → повторная попытка = 409 | todo | `apps/web/tests/e2e/warmup.spec.ts` |
| FT.6 | E2E тест: AI-чат → сообщение → ответ → история → новый диалог | todo | `apps/web/tests/e2e/ai-chat.spec.ts` |
| FT.7 | Accessibility audit: axe-core на все страницы, контрасты, aria-labels, keyboard navigation | todo | `apps/web/tests/a11y/` |
| FT.8 | Performance: Lighthouse CI на каждый PR (>90 perf, >95 a11y) | todo | `.github/workflows/lighthouse.yml` |
| FT.9 | Unit-тесты хуков: useBattle, useAuth — все состояния и edge cases | todo | `apps/web/hooks/__tests__/` |
| FT.10 | Unit-тесты компонентов: Button, Card, BottomNav, SideNav, RadarChart (vitest + testing-library) | todo | `apps/web/components/__tests__/` |
| FT.11 | Тест offline-режима: отключить сеть → кеш → fallback → восстановление | todo | `apps/web/tests/e2e/offline.spec.ts` |
| FT.12 | Тест push-уведомлений: подписка → получение → клик → переход | todo | `apps/web/tests/e2e/push.spec.ts` |
| FT.13 | Cross-browser: Chrome, Safari, Firefox — анимации, glassmorphism, blur | todo | `apps/web/tests/cross-browser/` |
| FT.14 | Memory leak тест: 10 баттлов подряд без перезагрузки, мониторинг JS heap | todo | `apps/web/tests/performance/` |
| FT.15 | Тест звуковых эффектов: вкл/выкл, корректное воспроизведение, не блокирует UI | todo | `apps/web/tests/` |

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

## Неделя 5 — Модули обучения

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B5.1 | Проверить таблицы Module, UserModuleProgress в схеме | done | `prisma/schema.prisma` |
| B5.2 | Переписать LearnService — CRUD модулей, прогресс, разблокировка | done | `apps/api/src/learn/learn.service.ts` |
| B5.3 | Переписать LearnController — GET /modules, GET /modules/:id, POST /modules/:id/progress | done | `apps/api/src/learn/learn.controller.ts` |
| B5.4 | DTO с class-validator: GetModulesQueryDto, SubmitProgressDto | done | `apps/api/src/learn/dto/` |
| B5.5 | Seed 10 модулей (5 Стратегия + 5 Логика) по 5 вопросов | done | `prisma/seed.ts` |

## Неделя 7 — Разминка (доработка: WarmupResult + БД-персистенция)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B7.1 | WarmupController (GET /warmup/today, POST /warmup/submit) — уже реализован Lead'ом | done | `apps/api/src/warmup/warmup.controller.ts` |
| B7.2 | Логика стрика (streakDays/streakDate, 409 при повторе) — уже реализована Lead'ом | done | `apps/api/src/warmup/warmup.service.ts` |
| B7.3 | Таблица WarmupResult в Prisma + миграция | done | `prisma/schema.prisma`, `prisma/migrations/` |
| B7.4 | Сохранение WarmupResult в БД при submit + fallback hasCompletedToday через БД | done | `apps/api/src/warmup/warmup.service.ts` |

## Неделя 6 — AI-диалог (контроллер + БД)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B6.1 | Проверить таблицу AiDialogue в Prisma (уже есть) | done | `prisma/schema.prisma` |
| B6.2 | DTO: CreateDialogueDto, SendMessageDto, GetDialoguesQueryDto | done | `apps/api/src/ai/dto/` |
| B6.3 | AiController: POST /ai/dialogue, POST /ai/dialogue/:id/message, GET /ai/dialogue/:id, GET /ai/dialogues | done | `apps/api/src/ai/ai.controller.ts` |
| B6.4 | Обновить AiModule — подключить контроллер, PrismaModule, RedisModule | done | `apps/api/src/ai/ai.module.ts` |

## Неделя 8 — Уведомления и статы

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B8.1 | NotificationModule — POST/DELETE /notifications/subscribe | done | `apps/api/src/notification/` |
| B8.2 | Таблица PushSubscription в Prisma + миграция | done | `prisma/schema.prisma` |
| B8.3 | StatsService.getSummary() — уровень, рейтинг, стрик, класс мыслителя | done | `apps/api/src/stats/stats.service.ts`, `apps/api/src/stats/stats.controller.ts` |
| B8.4 | Калькулятор класса мыслителя в shared (5 классов) | done | `packages/shared/src/stats/` |

## Неделя 9 — Админка контента (500+ вопросов)

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B9.1 | QuestionModule для админки — фильтры (branch/status/difficulty), пагинация | done | `apps/api/src/question/question.controller.ts` |
| B9.2 | GET /questions/stats — количество по категориям/сложностям | done | `apps/api/src/question/question.controller.ts` |
| B9.3 | POST /questions/:id/report + GET /questions/reported | done | `apps/api/src/question/question.controller.ts` |
| B9.4 | POST /questions/bulk — загрузка вопросов | done | `apps/api/src/question/question.controller.ts` |

## Неделя 10 — Тесты и оптимизация

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B10.1 | E2E тесты: auth, learn, warmup, battle | done | `apps/api/test/*.e2e-spec.ts` |
| B10.2 | Composite indexes (questions, battles, userStats) | done | `prisma/migrations/20260407260000_add_composite_indexes/` |
| B10.3 | Пагинация во всех list-эндпоинтах | done | контроллеры |

## Неделя 11 — Лидерборд и социальные фичи

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B11.1 | LeaderboardService — топ-20, Redis-кеш 5 мин TTL | done | `apps/api/src/stats/leaderboard.service.ts` |
| B11.2 | GET /leaderboard/me — позиция пользователя | done | `apps/api/src/stats/stats.controller.ts` |
| B11.3 | thinkerClass в UserStats + миграция | done | `prisma/schema.prisma` |
| B11.4 | Расширить GET /users/:id/profile — thinkerClass, позиция в лидерборде | done | `apps/api/src/user/user.controller.ts` |

## Неделя 12 — Финальная оптимизация БД

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B12.1 | Добавить 8 недостающих индексов (battleRounds, aiDialogues, userStats streak, battles endedAt/winnerId, questions composite, expression index totalXp) | done | `prisma/schema.prisma`, `prisma/migrations/20260407280000_add_performance_indexes/` |
| B12.2 | Оптимизировать getRandomForBattle — ORDER BY RANDOM() вместо загрузки всех в память | done | `apps/api/src/question/question.service.ts` |
| B12.3 | Оптимизировать leaderboard XP — raw SQL + expression index вместо fallback на rating | done | `apps/api/src/stats/leaderboard.service.ts` |
| B12.4 | Исправить N+1 в achievements — batch findMany + $transaction | done | `apps/api/src/achievements/achievements.service.ts` |
| B12.5 | Оптимизировать random fact selection — один запрос вместо count + skip | done | `apps/api/src/facts/facts.service.ts` |
| B12.6 | Настроить connection pooling + slow query logging | done | `apps/api/src/prisma/prisma.service.ts`, `.env.example` |
| B12.7 | Edge cases: 0 вопросов в категории, удаление пользователя, JWT expiry в батле | done | `question.service.ts`, `user.service.ts`, `user.controller.ts`, `battle.gateway.ts`, `auth.service.ts`, `prisma/schema.prisma` |
| B12.8 | Production seed: все 500+ вопросов и модули в production БД | done | `prisma/seed-production.ts` |

## Блок 13 — Миграция на 5 веток

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B13.1 | Prisma миграция: Branch enum + ERUDITION, RHETORIC, INTUITION | done | `prisma/schema.prisma` — enum уже содержал все 5 значений |
| B13.2 | Обновить seed.ts: вопросы и модули для всех 5 веток (минимум по 10 на ветку) | done | `prisma/seed.ts` — 40 новых вопросов, 9 модулей для 3 новых веток |
| B13.3 | Обновить все E2E тесты под 5 веток | done | `apps/api/test/learn.e2e-spec.ts`, `apps/api/test/battle.e2e-spec.ts` |

## Блок 14 — Контент и вопросы

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B14.1 | POST /questions/generate — эндпоинт для AI-генерации вопросов по категории/ветке | done | `apps/api/src/question/question.controller.ts`, `apps/api/src/question/question.service.ts`, `apps/api/src/question/dto/generate-questions.dto.ts` |
| B14.2 | GET /questions/gaps — анализ покрытия: вопросы по категории/сложности, пробелы | done | `apps/api/src/question/question.controller.ts`, `apps/api/src/question/question.service.ts` |
| B14.3 | POST /questions/bulk-validate — пакетная валидация вопросов перед загрузкой | done | `apps/api/src/question/question.controller.ts`, `apps/api/src/question/question.service.ts`, `apps/api/src/question/dto/bulk-validate.dto.ts` |
| B14.4 | GET /questions/export — экспорт вопросов в JSON для бэкапа | done | `apps/api/src/question/question.controller.ts`, `apps/api/src/question/question.service.ts` |
| B14.5 | Автоматическая ротация: деактивировать вопросы с >50% skip или <20% правильных после 100 ответов | done | `apps/api/src/question/question.service.ts` |
| B14.6 | Система тегов на вопросы: поиск и фильтрация по тегам | done | `prisma/schema.prisma`, `apps/api/src/question/question.service.ts`, `apps/api/src/question/question.controller.ts`, `prisma/migrations/20260409000000_add_question_tags/` |

## Блок 15 — Баттл-система v2

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B15.1 | Баттл с выбором ветки атаки: атакующий выбирает из 5 веток, защищающийся отвечает | done | `apps/api/src/battle/`, `packages/shared/src/battle/` |
| B15.2 | Рейтинг по веткам: отдельный ELO по каждой из 5 веток + общий | done | `apps/api/src/stats/`, `prisma/schema.prisma` |
| B15.3 | Matchmaking v2: учитывать рейтинг конкретной ветки, не только общий | done | `apps/api/src/battle/matchmaking.service.ts` |
| B15.4 | Режим "Спарринг": дружеский матч без влияния на рейтинг (по инвайт-ссылке) | done | `apps/api/src/battle/` |
| B15.5 | Реванш: после баттла предложить противнику повторный матч | done | `apps/api/src/battle/battle.gateway.ts` |
| B15.6 | Бот v2: 3 уровня сложности (Новичок 40%, Стандарт 60%, Эксперт 85%) | todo | `apps/api/src/battle/bot.service.ts` |

## Блок 16 — Пользовательская система v2

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B16.1 | UserStats: отдельные поля XP по каждой из 5 веток | todo | `prisma/schema.prisma`, `apps/api/src/stats/` |
| B16.2 | Система уровней по веткам: уровень ветки = f(xp), общий уровень = среднее | todo | `packages/shared/src/stats/`, `apps/api/src/stats/` |
| B16.3 | Класс мыслителя v2: определяется по доминирующей ветке (5+ классов) | todo | `packages/shared/src/stats/` |
| B16.4 | Достижения v2: ачивки за прокачку каждой ветки (25 новых) | todo | `apps/api/src/achievements/` |
| B16.5 | GET /users/:id/compare — сравнение двух профилей для экрана VS | todo | `apps/api/src/user/` |

## Блок 17 — Аналитика и умные фичи

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B17.1 | GET /stats/me/weaknesses — слабые ветки и категории (по % правильных) | todo | `apps/api/src/stats/` |
| B17.2 | GET /stats/me/recommendations — рекомендации модулей для прокачки слабых веток | todo | `apps/api/src/stats/` |
| B17.3 | Адаптивный подбор: сложность вопросов по рейтингу игрока в конкретной ветке | todo | `apps/api/src/question/question.service.ts` |
| B17.4 | Token usage tracking: расход токенов AI по дням, лимиты, алерты | todo | `apps/api/src/ai/`, `prisma/schema.prisma` |
| B17.5 | Rate limiting v2: per-user daily AI quota (диалоги + генерация) | todo | `apps/api/src/ai/ai.controller.ts` |

## Блок 18 — Инфраструктура

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B18.1 | WebSocket reconnect: корректный rejoin баттла после дисконнекта | todo | `apps/api/src/battle/battle.gateway.ts` |
| B18.2 | DB connection pool tuning: production конфиг для 100+ concurrent users | todo | `apps/api/src/prisma/prisma.service.ts` |
| B18.3 | Redis caching strategy: кеш вопросов, статов, лидерборда с TTL | todo | `apps/api/src/redis/` |
| B18.4 | Cron jobs: ежедневный пересчёт лидерборда, ротация challenge, очистка sessions | todo | `apps/api/src/` |
| B18.5 | Production seed v2: все 25 категорий, минимум 500 вопросов для запуска | todo | `prisma/seed.ts` |
| B18.6 | Database backup automation: pg_dump cron + upload to S3 | todo | `scripts/backup.sh` |
| B18.7 | Graceful shutdown: корректное завершение активных баттлов при рестарте | todo | `apps/api/src/main.ts` |

## Блок 19 — Дополнительные фичи

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| B19.1 | WebSocket rooms по веткам: зрители могут смотреть баттлы по ветке | todo | `apps/api/src/battle/battle.gateway.ts` |
| B19.2 | Сезонный рейтинг: ежемесячный reset с наградами для топ-10 | todo | `apps/api/src/stats/` |
| B19.3 | Streak protection: 1 бесплатный пропуск разминки в неделю без потери стрика | todo | `apps/api/src/warmup/warmup.service.ts` |
| B19.4 | Daily/weekly/monthly stats digest (Telegram бот) | todo | `apps/api/src/telegram/` |
| B19.5 | Content moderation queue: пользовательские репорты → очередь для админа | todo | `apps/api/src/question/` |
| B19.6 | A/B тестирование вопросов: 2 формулировки, сравнение % правильных | todo | `apps/api/src/question/` |
| B19.7 | Import/export профиля: JSON dump всей истории пользователя (GDPR) | todo | `apps/api/src/user/` |
| B19.8 | Турниры: 8/16 игроков, bracket, расписание, призовой фонд XP | todo | `apps/api/src/tournament/` |
| B19.9 | Система банов: временный/перманентный, причина, апелляция | todo | `apps/api/src/user/`, `prisma/schema.prisma` |
| B19.10 | Webhook интеграция: оповещения о событиях для внешних сервисов | todo | `apps/api/src/webhook/` |
| B19.11 | API versioning v2: подготовка второй версии без слома v1 | todo | `apps/api/src/` |
| B19.12 | Healthcheck dashboard: status всех сервисов (DB, Redis, AI, WS) | todo | `apps/api/src/health/` |

## Тестирование Яшкин

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| BT.1 | E2E: полный цикл баттла с 5 ветками — создание, 5 раундов, скоринг, XP | todo | `apps/api/test/battle-v2.e2e-spec.ts` |
| BT.2 | E2E: auth полный цикл — register → login → refresh → expired → refresh → ok | todo | `apps/api/test/auth.e2e-spec.ts` |
| BT.3 | E2E: вопросы — CRUD, фильтры по 5 веткам, bulk, report, auto-deactivate | todo | `apps/api/test/questions.e2e-spec.ts` |
| BT.4 | E2E: обучение — modules 5 веток, progress, unlock, completion | todo | `apps/api/test/learn.e2e-spec.ts` |
| BT.5 | E2E: стат-система — XP по 5 веткам, level up, thinkerClass пересчёт | todo | `apps/api/test/stats.e2e-spec.ts` |
| BT.6 | E2E: лидерборд — топ-20, позиция юзера, кеш-инвалидация | todo | `apps/api/test/leaderboard.e2e-spec.ts` |
| BT.7 | E2E: AI — диалог, сообщения, daily limit, token counting | todo | `apps/api/test/ai.e2e-spec.ts` |
| BT.8 | E2E: разминка — today, submit, streak, duplicate prevention | todo | `apps/api/test/warmup.e2e-spec.ts` |
| BT.9 | E2E: достижения — unlock, список, прогресс, ачивки за 5 веток | todo | `apps/api/test/achievements.e2e-spec.ts` |
| BT.10 | E2E: уведомления — subscribe, unsubscribe, push | todo | `apps/api/test/notifications.e2e-spec.ts` |
| BT.11 | Unit: QuestionService.recalibrateDifficulty — граничные случаи, <20 ответов | todo | `apps/api/src/question/__tests__/` |
| BT.12 | Unit: MatchmakingService — расширение диапазона, таймаут → бот, concurrent | todo | `apps/api/src/battle/__tests__/` |
| BT.13 | Unit: BattleStateMachine — все переходы, невалидные, таймауты, disconnect | todo | `packages/shared/__tests__/battle/` |
| BT.14 | Unit: scoring — ELO для 5 веток, edge cases, новичок vs ветеран | todo | `packages/shared/__tests__/battle/` |
| BT.15 | Unit: KnowledgeService — vector search, similarity threshold, empty, fallback | todo | `apps/api/src/knowledge/__tests__/` |
| BT.16 | Load: k6 скрипт на 100 concurrent баттлов, response time, error rate | todo | `scripts/load-tests/` |
| BT.17 | Load: WebSocket — 200 одновременных подключений, broadcast latency | todo | `scripts/load-tests/` |
| BT.18 | Security: SQL injection, XSS в вопросах, JWT подделка, rate limit bypass | todo | `apps/api/test/security/` |
| BT.19 | Security: RBAC — USER vs ADMIN endpoints, невалидный JWT, expired refresh | todo | `apps/api/test/security/` |
| BT.20 | Database: EXPLAIN ANALYZE всех индексов под нагрузкой, slow query detection | todo | `scripts/db-audit/` |

## Ядро контента — RAG-пайплайн и генерация (Backend)

| # | Задача | Статус | Файлы | Блокер |
|---|--------|--------|-------|--------|
| BC1 | pgvector миграция + таблица `knowledge_chunks` | done | `prisma/schema.prisma`, миграция | — |
| BC2 | `scripts/process-content.ts` — парсинг PDF/txt, очистка от мусора | done | `scripts/process-content.ts` | — |
| BC3 | `scripts/extract-concepts.ts` — извлечение концептов через Haiku | done | `scripts/extract-concepts.ts` | BC2 ✅, LC4 ✅ |
| BC4 | `scripts/embed-content.ts` — генерация эмбеддингов, запись в pgvector | done | `scripts/embed-content.ts` | BC1 ✅, BC3 ✅ |
| BC5 | KnowledgeService — поиск по векторной базе (similarity search) | done | `apps/api/src/knowledge/` | BC4 ✅ |
| BC6 | Обновить `generate-questions.ts` — батч-генерация по таксономии с антидубль-проверкой | done | `scripts/generate-questions.ts` | LC1 ✅, LC3 ✅ |
| BC7 | Адаптивная генерация — QuestionService.getForBattle() с fallback на AI | done | `apps/api/src/question/question.service.ts` | BC5 ✅, LC4 ✅ |
| BC8 | Система обратной связи — лайк/дизлайк/репорт на вопросы + авто-ревью | done | `apps/api/src/question/` | — |
| BC9 | Автоматическая адаптация сложности по статистике ответов | done | `apps/api/src/question/`, `apps/api/src/battle/` | BC8 ✅ |

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
| LC9 | Генерация вопросов из академических концептов (Дёрнер и др.) → JSON для seed/bulk загрузки | todo | `content/sources/academic/`, `content/processed/` |
| LC8 | Система контроля качества вопросов (автопроверки, правила валидации) | done | `packages/shared/src/content/validation.ts` |
| LC10 | 🧠 LLM-машина — автономный AI-движок: очередь генерации, gap-анализ, роутинг моделей, бюджет токенов, feedback loop, авторотация вопросов | todo | `apps/api/src/ai/`, `apps/api/src/knowledge/` |

## Новые задачи — Инфраструктура и безопасность

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N1 | Swagger/OpenAPI документация для всего API | done | все controllers |
| N2 | Health-check эндпоинты (/health, /ready) | done | `apps/api/src/health/` |
| N3 | Rate limiting (глобальный + per-endpoint) | done | `apps/api/src/common/decorators/throttle.decorator.ts` |
| N4 | Security headers (CSP, HSTS, X-Frame-Options) | done | `apps/api/src/main.ts`, `nginx/nginx.conf` |
| N5 | API versioning (/v1/) | done | `apps/api/src/main.ts`, `apps/api/src/app.controller.ts` |
| N19 | Скрипты BC3/BC6 переведены на Polza.ai (OpenAI-совместимый). Эмбеддинги (BC4) ещё требуют OPENAI_API_KEY | done | `scripts/extract-concepts.ts`, `scripts/generate-questions.ts` |

## Новые задачи — Пользовательский опыт

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N6 | Онбординг-флоу для нового пользователя | done | `apps/web/app/(main)/onboarding/page.tsx` |
| N7 | Система достижений (achievements) | done | `prisma/schema.prisma`, `apps/api/src/achievements/` |
| N8 | Страницы ошибок (404, 500, offline) | done | `apps/web/app/not-found.tsx`, `apps/web/app/error.tsx`, `apps/web/app/offline.tsx` |
| N9 | Telegram-бот для уведомлений и инвайтов | done | `apps/api/src/telegram/` |
| N10 | Система реферальных кодов | done | `apps/api/src/referral/` |

## Новые задачи — Аналитика и мониторинг

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N11 | Event tracking (батлы, ответы, сессии) | done | `apps/api/src/analytics/` |
| N12 | Дашборд PO — статистика в реальном времени | done | `apps/web/app/admin/dashboard/page.tsx` |
| N13 | Структурированные логи (Pino) | done | `nestjs-pino` в `app.module.ts` |

## Новые задачи — Контент и игровые механики

| # | Задача | Статус | Файлы |
|---|--------|--------|-------|
| N14 | Система ежедневных челленджей | done | `apps/api/src/challenge/` |
| N15 | «Факт дня» на главном экране | done | `apps/api/src/facts/`, `apps/web/components/` |
| N16 | Звуковые эффекты для баттлов (Web Audio API) | done | `apps/web/lib/sounds.ts` |

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
