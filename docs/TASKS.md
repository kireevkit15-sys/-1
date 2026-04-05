# РАЗУМ — Распределение задач по команде

> **Срок MVP:** 12 недель (апрель — июнь 2026)
> **Команда:** 3 человека
> **Документ обновлён:** 2026-04-05

---

## 1. Роли в команде

### Руководитель (Lead)

**Зона ответственности:**
- Архитектурные решения: выбор библиотек, структура модулей, паттерны
- Инфраструктура и DevOps: Docker, CI/CD, деплой на VPS, nginx, SSL
- AI-интеграция: Claude API wrapper, системные промпты, rate limiting, генерация контента
- Критические backend-модули: стейт-машина батла (`packages/shared/src/battle/`), WebSocket gateway (`apps/api/src/battle/battle.gateway.ts`), матчмейкинг (`apps/api/src/battle/matchmaking.service.ts`)
- Code review всех PR от Разработчиков 1 и 2
- Управление приоритетами, разблокировка зависимостей
- Нагрузочное тестирование, оптимизация производительности

**Ревьюит:** все PR в `main`
**Не делает:** рутинные CRUD-эндпоинты, вёрстку страниц

---

### Бонди (Frontend + Дизайн)

**Зона ответственности:**
- Всё внутри `apps/web/`: pages, components, hooks, styles
- UI/UX дизайн: макеты, визуальный стиль, иконки, цвета, типографика
- PWA: manifest, service worker (Serwist), push-подписка, install prompt
- Адаптивный дизайн, mobile-first, тёмная тема
- Анимации и микро-интеракции (Framer Motion)
- Socket.IO клиент (`apps/web/lib/socket.ts`)
- Интеграция с REST API через fetch/axios обёртку (`apps/web/lib/api.ts`)
- Графики: радар-чарт статов (Recharts), лидерборд
- OG-изображения для шеринга профиля

**Ревьюит:** PR других разработчиков в `apps/web/` (второй ревьюер после Lead)
**Не делает:** backend-логику, миграции БД, Docker-конфигурацию

---

### Яшкин (Backend)

**Зона ответственности:**
- NestJS модули в `apps/api/src/`: controllers, services, DTOs, guards
- Prisma: схема (`prisma/schema.prisma`), миграции, seed-данные
- REST API эндпоинты: auth, user, question, learn, stats, warmup, leaderboard
- Аутентификация: Telegram Login Widget, email/пароль, JWT + refresh tokens
- Админ-панель API: CRUD вопросов, модерация контента, отчёты пользователей
- Пайплайн контента: `scripts/generate-questions.ts`, валидация, массовый импорт

**Ревьюит:** PR других разработчиков в `apps/api/` и `prisma/` (второй ревьюер после Lead)
**Не делает:** фронтенд-компоненты, WebSocket gateway, стейт-машину батла

---

## 2. Понедельный план задач

---

### Неделя 1 — Инициализация монорепо и инфраструктура

#### Lead
- [ ] Создать Turborepo монорепо: `apps/web`, `apps/api`, `packages/shared`
- [ ] Настроить `turbo.json` с pipeline: `build`, `dev`, `lint`, `typecheck`, `test`
- [ ] Настроить `tsconfig.base.json` с strict mode, path aliases
- [ ] Настроить ESLint (`eslintrc.js`) + Prettier (`.prettierrc`) для всего монорепо
- [ ] Создать `docker-compose.yml`: PostgreSQL 16 + Redis 7 + volumes
- [ ] Настроить GitHub Actions (`.github/workflows/ci.yml`): lint → typecheck → test на каждый PR
- [ ] Написать README с инструкцией по локальному запуску
- [ ] Инициализировать `packages/shared`: package.json, tsconfig, пустые модули

#### Бонди
- [ ] Инициализировать Next.js 14 App Router в `apps/web/`
- [ ] Настроить тёмную тему: CSS-переменные в `apps/web/styles/globals.css` (`--bg: #0a0a0a`, акцентные цвета)
- [ ] Создать базовый layout: `apps/web/app/layout.tsx` с метатегами, шрифтами
- [ ] Создать layout основного раздела: `apps/web/app/(main)/layout.tsx` с нижней навигацией (4 вкладки: Главная, Батл, Обучение, Профиль)
- [ ] Настроить PWA manifest: `apps/web/public/manifest.json` (display: standalone, theme_color, icons)
- [ ] Настроить Serwist service worker: `apps/web/public/sw.js` — кеширование app shell
- [ ] Создать базовые UI-компоненты: `apps/web/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Loader.tsx`

#### Яшкин
- [ ] Инициализировать NestJS 10 в `apps/api/`: `main.ts`, `app.module.ts`
- [ ] Настроить Prisma: `prisma/schema.prisma` — таблицы `User`, `UserStats`
- [ ] Выполнить первую миграцию: `npx prisma migrate dev --name init`
- [ ] Создать `PrismaModule` и `PrismaService` в `apps/api/src/common/`
- [ ] Настроить ConfigModule: `.env` файл, валидация переменных через Joi
- [ ] Создать базовые guards: `apps/api/src/common/guards/jwt-auth.guard.ts`
- [ ] Создать глобальные фильтры ошибок: `apps/api/src/common/filters/http-exception.filter.ts`

#### Зависимости
- Lead создаёт монорепо первым (день 1) — все остальные начинают на его основе
- Яшкин ждёт Docker Compose от Lead для локальной БД

#### Результат недели
Монорепо запускается командой `pnpm dev`. PostgreSQL и Redis работают в Docker. CI проходит. Тёмная тема и пустые страницы отображаются.

---

### Неделя 2 — Аутентификация + ядро батл-движка

#### Lead
- [ ] Написать стейт-машину батла: `packages/shared/src/battle/state-machine.ts`
  - Состояния: `WAITING → MATCHED → CATEGORY_SELECT → ROUND_ATTACK → ROUND_DEFENSE → ROUND_RESULT → SWAP_ROLES → FINAL_RESULT`
  - Чистые функции: `transition(state, event) → newState`
  - Без побочных эффектов, без зависимостей
- [ ] Написать модуль скоринга: `packages/shared/src/battle/scoring.ts`
  - Подсчёт очков по сложности: bronze=1, silver=2, gold=3
  - XP за ответы: bronze=100, silver=200, gold=350
  - ELO расчёт: +50 победа, -25 поражение
- [ ] Описать типы батла: `packages/shared/src/battle/types.ts`
  - `BattleState`, `BattleEvent`, `Round`, `PlayerAction`, `BattleResult`
- [ ] Написать unit-тесты: `packages/shared/__tests__/battle/state-machine.test.ts`
  - Все переходы состояний, edge cases (таймаут, дисконнект)
  - Минимум 20 тестов
- [ ] Code review всех PR недели

#### Бонди
- [ ] Создать страницу логина: `apps/web/app/(auth)/login/page.tsx`
  - Кнопка «Войти через Telegram» (Telegram Login Widget)
  - Форма email/пароль как альтернатива
  - Тёмная тема, мобильный дизайн
- [ ] Создать layout авторизации: `apps/web/app/(auth)/layout.tsx`
- [ ] Подключить NextAuth.js v5: `apps/web/app/api/auth/[...nextauth]/route.ts`
  - Telegram provider + Credentials provider (email/пароль)
  - JWT strategy
- [ ] Создать хук `apps/web/hooks/useAuth.ts` — текущий пользователь, logout, guard
- [ ] Защитить маршруты `(main)/*` middleware: `apps/web/middleware.ts` — редирект на логин

#### Яшкин
- [ ] Создать `AuthModule`: `apps/api/src/auth/auth.module.ts`
- [ ] Написать `auth.controller.ts`:
  - `POST /auth/telegram` — валидация hash из Telegram Login Widget
  - `POST /auth/email/register` — регистрация, bcrypt hash пароля
  - `POST /auth/email/login` — вход, возврат JWT
  - `POST /auth/refresh` — обновление access token
- [ ] Написать `auth.service.ts`: логика валидации, создание пользователя + UserStats
- [ ] Создать JWT strategy: `apps/api/src/auth/strategies/jwt.strategy.ts`
- [ ] Создать Telegram strategy: `apps/api/src/auth/strategies/telegram.strategy.ts`
- [ ] Создать `UserModule`: `apps/api/src/user/user.module.ts`
  - `GET /users/me` — текущий пользователь + статы
  - `PATCH /users/me` — обновление имени, аватара
- [ ] Добавить в Prisma-схему таблицу `Question`, `Battle`, `BattleRound` → миграция

#### Зависимости
- Бонди ждёт от Разработчика 2 эндпоинты auth для подключения NextAuth
- Lead работает независимо над shared-пакетом

#### Результат недели
Пользователь может зарегистрироваться через Telegram или email. JWT аутентификация работает. Стейт-машина батла покрыта тестами.

---

### Неделя 3 — Батл API + бот + батл UI (часть 1)

#### Lead
- [ ] Создать WebSocket gateway: `apps/api/src/battle/battle.gateway.ts`
  - Namespace `/battle`
  - Авторизация через JWT handshake
  - События: `battle:join`, `battle:answer`, `battle:defend`
  - Комнаты Socket.IO для каждого батла
- [ ] Создать `BattleService`: `apps/api/src/battle/battle.service.ts`
  - Создание батла, управление раундами, применение стейт-машины
  - Таймер 60 сек на раунд (setTimeout + Redis fallback)
- [ ] Создать бот-противника: `apps/api/src/battle/bot.service.ts`
  - Детерминированный бот: 60% правильных ответов
  - Случайный выбор сложности (70% bronze, 20% silver, 10% gold)
  - Задержка 2-5 сек перед ответом (имитация человека)
- [ ] Создать `BattleController`: `apps/api/src/battle/battle.controller.ts`
  - `POST /battles` — создать батл vs бот
  - `GET /battles/:id` — состояние батла (для реконнекта)
  - `GET /battles/history` — история батлов

#### Бонди
- [ ] Создать Socket.IO клиент: `apps/web/lib/socket.ts`
  - Подключение к namespace `/battle` с JWT
  - Автореконнект, обработка ошибок
- [ ] Создать хук: `apps/web/hooks/useBattle.ts`
  - Подписка на события, управление локальным состоянием батла
- [ ] Создать страницу поиска батла: `apps/web/app/battle/new/page.tsx`
  - Кнопка «Батл с ботом»
  - Анимация ожидания
- [ ] Создать экран батла: `apps/web/app/battle/[id]/page.tsx`
  - Фаза выбора категории: 3 карточки, бан 1
  - Фаза атаки: выбор сложности (бронза/серебро/золото)
  - Таймер 60 сек (круговая анимация)

#### Яшкин
- [ ] Добавить `QuestionModule`: `apps/api/src/question/question.module.ts`
  - `GET /questions` — список с фильтрами (branch, difficulty, category)
  - `POST /questions/bulk` — массовый импорт JSON (admin only)
  - `PATCH /questions/:id` — редактирование
- [ ] Создать `QuestionService`: логика выборки случайных вопросов для батла
  - Метод `getRandomForBattle(category, difficulty, exclude[])` — исключить уже заданные
- [ ] Написать seed: `prisma/seed.ts` — 50 тестовых вопросов для отладки батлов
- [ ] Добавить guard `RolesGuard` для защиты admin-эндпоинтов

#### Зависимости
- Бонди ждёт от Lead WebSocket gateway для подключения клиента (начало недели)
- Lead ждёт от Разработчика 2 сервис вопросов для BattleService
- **Критично:** Lead должен завершить gateway к среде, чтобы Бонди мог тестировать UI

#### Результат недели
Батл с ботом работает через WebSocket. Вопросы отображаются. Таймер работает.

---

### Неделя 4 — Матчмейкинг, статы, контент, деплой

#### Lead
- [ ] Создать Redis-матчмейкинг: `apps/api/src/battle/matchmaking.service.ts`
  - Redis SORTED SET: ключ = рейтинг, значение = userId
  - Поиск оппонента: ±100 рейтинга, расширение диапазона каждые 5 сек
  - Таймаут 30 сек → предложить бота
- [ ] Подключить матчмейкинг к WebSocket gateway
  - Событие `matchmaking:join` → ожидание → `battle:matched`
- [ ] Обработка дисконнектов: >30 сек без переподключения = авто-поражение
- [ ] Первый деплой на VPS:
  - Docker Compose production: `docker-compose.prod.yml`
  - nginx reverse proxy + Let's Encrypt SSL
  - Переменные окружения через `.env.production`
  - Sentry SDK подключение (frontend + backend)
- [ ] Тестирование: 5-10 реальных людей играют батлы

#### Бонди
- [ ] Дополнить экран батла:
  - Фаза защиты: 3 кнопки «Принять / Оспорить / Контратака»
  - Экран результата раунда: анимация очков
  - Экран финального результата: победа/поражение, +XP, +рейтинг
- [ ] Создать страницу профиля: `apps/web/app/(main)/profile/page.tsx`
  - Радар-чарт 5 статов (Recharts: `RadarChart`)
  - Уровень и прогресс-бар до следующего
  - Список последних 10 батлов
- [ ] Добавить кнопку «Найти соперника» на `apps/web/app/battle/new/page.tsx`
  - Анимация поиска (пульсирующий круг)
  - Показ найденного оппонента перед стартом

#### Яшкин
- [ ] Создать `StatsModule`: `apps/api/src/stats/stats.module.ts`
  - Логика начисления XP по результатам батла
  - `level = Math.floor(Math.sqrt(xp / 100))`
  - Обновление `UserStats` после каждого батла
- [ ] Расширить `GET /users/me` — включить статы, уровень, историю батлов
- [ ] Создать `GET /users/:id/profile` — публичный профиль
- [ ] Написать скрипт генерации вопросов: `scripts/generate-questions.ts`
  - Вызов Claude API (Sonnet) для генерации вопросов в формате JSON
  - Параметры: category, branch, difficulty, count
  - Вывод в `scripts/output/questions-{timestamp}.json`
- [ ] Сгенерировать и вручную проверить 200 вопросов (Стратегия + Логика)
- [ ] Обновить `prisma/seed.ts` для загрузки 200 вопросов

#### Зависимости
- Lead деплоит после того, как auth + батл стабилизированы (конец недели)
- Бонди ждёт от Lead матчмейкинг для кнопки «Найти соперника»
- Яшкин работает параллельно (статы + контент)

#### Результат недели
**Milestone 1:** Вход через Telegram → батл с ботом или человеком → статы растут → профиль с радар-чартом. Продукт задеплоен и доступен по URL.

---

### Неделя 5 — Модули обучения (Backend + UI каркас)

#### Lead
- [ ] Code review и стабилизация батл-модуля (фикс багов после деплоя)
- [ ] Доработка WebSocket: обработка edge cases
  - Оба дисконнектнулись → отмена батла
  - Перезагрузка страницы → автоматический реконнект в комнату
  - Дублирование событий при быстром переподключении
- [ ] Написать интеграционные тесты для батл-флоу:
  - `apps/api/test/battle.e2e-spec.ts`
  - Полный цикл: создание → раунды → финал → обновление статов

#### Бонди
- [ ] Создать страницу обучения: `apps/web/app/learn/page.tsx`
  - Две ветки: «Стратегия» и «Логика»
  - Плоский список модулей в каждой ветке
  - Иконки статуса: заблокирован / доступен / пройден
  - Прогресс-бар на каждом модуле
- [ ] Создать страницу модуля: `apps/web/app/learn/[moduleId]/page.tsx`
  - Описание модуля
  - Список вопросов с чекбоксами выполнения
  - Карточка вопроса: текст → варианты ответа → результат → объяснение
  - Кнопка «Спросить AI» (заготовка, подключение на неделе 6-7)
- [ ] Компонент вопроса: `apps/web/components/learn/QuestionCard.tsx`
  - Варианты ответа как кнопки
  - Анимация правильного/неправильного ответа (зелёный/красный)
  - Блок объяснения после ответа

#### Яшкин
- [ ] Убедиться, что таблицы `Module`, `UserModuleProgress` в схеме → миграция
- [ ] Создать `LearnModule`: `apps/api/src/learn/learn.module.ts`
- [ ] Написать `learn.controller.ts`:
  - `GET /modules?branch=strategy` — список модулей по ветке
  - `GET /modules/:id` — модуль с вопросами (populate questions)
  - `POST /modules/:id/progress` — отметить вопрос как пройденный
- [ ] Написать `learn.service.ts`:
  - Логика разблокировки: модуль N+1 доступен после завершения модуля N
  - Проверка: вопрос принадлежит модулю, пользователь имеет доступ
- [ ] Создать seed модулей: 5 модулей в «Стратегия», 5 в «Логика»
  - Каждый модуль = 5 вопросов из существующих 200

#### Зависимости
- Бонди может начинать UI с моковыми данными, не ожидая backend
- Яшкин должен завершить API к четвергу для интеграции с фронтом

#### Результат недели
Список модулей отображается. Можно открыть модуль, ответить на вопросы. Прогресс сохраняется.

---

### Неделя 6 — Модули обучения (полировка) + начало AI-диалога

#### Lead
- [ ] Начать AI-интеграцию: `apps/api/src/ai/ai.module.ts`
- [ ] Написать `ai.service.ts`:
  - Обёртка Anthropic SDK: `new Anthropic({ apiKey })`
  - Метод `chat(dialogueId, userMessage)`: отправка в Claude Haiku
  - Подсчёт токенов: `input_tokens + output_tokens` → сохранение в `AiDialogue.token_count`
  - Ограничения: макс 10 обменов, макс 2000 output tokens
- [ ] Написать системный промпт: `apps/api/src/ai/prompts/socratic-tutor.ts`
  - Шаблон с подстановкой: `{topic}`, `{branch}`, `{level}`
  - Правила сократического метода (см. ARCHITECTURE.md)
- [ ] Настроить rate limiting через Redis:
  - Ключ: `ai:dialogue:limit:{userId}:{date}`
  - Free: 1 диалог/день, TTL 24h

#### Бонди
- [ ] Полировка модулей обучения:
  - Анимация перехода между вопросами
  - Экран завершения модуля: «Модуль пройден!» + статистика
  - Интеграция с реальным API (замена моков)
- [ ] Подготовить компонент чата для AI: `apps/web/components/learn/AiChat.tsx`
  - Интерфейс сообщений: пузыри «пользователь» / «AI»
  - Поле ввода + кнопка отправки
  - Индикатор «AI печатает...»
  - Скролл к последнему сообщению

#### Яшкин
- [ ] Написать `ai.controller.ts`:
  - `POST /ai/dialogue` — начать или продолжить диалог
    - Тело: `{ moduleId?, topic, message }`
    - Создание новой записи `AiDialogue` или append к существующей
  - `GET /ai/dialogue/:id` — история диалога
  - `GET /ai/dialogues` — список диалогов пользователя (пагинация)
- [ ] Добавить таблицу `AiDialogue` в Prisma (если ещё нет) → миграция
- [ ] Добавить валидацию: DTO через `class-validator`
  - `CreateDialogueDto`, `SendMessageDto`
  - Проверка длины сообщения (макс 500 символов)

#### Зависимости
- Lead пишет `ai.service.ts` → Яшкин использует его в контроллере
- **Критично:** Lead должен завершить ai.service.ts к среде, чтобы Яшкин мог подключить контроллер

#### Результат недели
Модули обучения полностью функциональны. AI-сервис готов на бэкенде. Чат-компонент готов на фронте.

---

### Неделя 7 — AI-диалог (интеграция) + разминка (backend)

#### Lead
- [ ] Интеграционное тестирование AI-диалога:
  - E2E тест: `apps/api/test/ai.e2e-spec.ts`
  - Мок Claude API для тестов (не тратить токены)
  - Проверка rate limiting
  - Проверка подсчёта токенов
- [ ] Написать кеширование частых тем в Redis:
  - Ключ: `ai:cached:opener:{topic}:{branch}`
  - Первый ответ AI по популярной теме берётся из кеша
  - TTL 7 дней
- [ ] Начать `WarmupService`: `apps/api/src/stats/warmup.service.ts`
  - `getToday(userId)` — 5 случайных вопросов (не повторять за последние 30 дней)
  - `submit(userId, answers[])` — подсчёт, обновление стрика
  - Стрик: если `streak_date === yesterday` → streak_days++, иначе → 1

#### Бонди
- [ ] Подключить AI-чат к реальному API:
  - Кнопка «Спросить AI» на странице модуля → открывает чат
  - Стриминг ответа (если поддерживается) или loading state
  - Отображение лимита: «Осталось 0 из 1 диалога сегодня»
  - Блокировка ввода при достижении лимита
- [ ] Создать страницу списка диалогов: `apps/web/app/learn/dialogues/page.tsx`
  - Список прошлых диалогов (тема, дата, кол-во сообщений)
  - Клик → просмотр истории

#### Яшкин
- [ ] Написать `warmup.controller.ts` в `apps/api/src/stats/`:
  - `GET /warmup/today` — 5 вопросов для сегодняшней разминки
  - `POST /warmup/submit` — принять ответы, вернуть результат + стрик
- [ ] Логика стрика:
  - Обновление `UserStats.streak_days` и `streak_date`
  - Если пользователь уже делал разминку сегодня — ошибка 409
- [ ] Создать таблицу `WarmupResult` (опционально, для аналитики):
  ```
  user_id, date, correct_count, total_count, time_taken_ms
  ```
  Миграция

#### Зависимости
- Бонди зависит от Lead (ai.service) и Разработчика 2 (ai.controller) — оба должны быть готовы к понедельнику
- Яшкин использует `WarmupService` от Lead

#### Результат недели
AI сократический диалог работает end-to-end. Backend разминки готов.

---

### Неделя 8 — Разминка (UI) + Push + Главный экран

#### Lead
- [ ] Настроить Web Push API на бэкенде: `apps/api/src/notification/notification.service.ts`
  - Генерация VAPID ключей
  - Хранение подписок в БД (таблица `PushSubscription`)
  - Метод `sendPush(userId, title, body, url)`
- [ ] Настроить cron-задачи (NestJS `@nestjs/schedule`):
  - 08:00 МСК — «Утренняя разминка ждёт!»
  - 20:00 МСК — «Вечерний вызов: проведи батл!»
- [ ] Code review + фикс критических багов перед milestone 2

#### Бонди
- [ ] Создать экран разминки: `apps/web/app/(main)/warmup/page.tsx`
  - 5 вопросов последовательно
  - Таймер 30 сек на вопрос
  - Прогресс-бар (1/5, 2/5...)
  - Экран результата: X/5 правильных, +XP, стрик
- [ ] Создать главный экран: `apps/web/app/(main)/page.tsx`
  - Блок «Ежедневная разминка» (статус: доступна / выполнена + результат)
  - Кнопка «Батл» (найти соперника / играть с ботом)
  - Стрик-счётчик с огоньком (streak: N дней)
  - Мини-карточка статов (уровень, рейтинг, класс мыслителя)
- [ ] Подключить Push-подписку:
  - Service worker: обработка push-событий в `apps/web/public/sw.js`
  - Запрос разрешения на уведомления (после 3-го визита)
  - Отправка подписки на `POST /notifications/subscribe`

#### Яшкин
- [ ] Создать `NotificationModule`: `apps/api/src/notification/notification.module.ts`
  - `POST /notifications/subscribe` — сохранить подписку
  - `DELETE /notifications/subscribe` — удалить подписку
- [ ] Добавить таблицу `PushSubscription` в Prisma:
  ```
  user_id, endpoint, p256dh, auth, created_at
  ```
- [ ] Расширить `StatsService`:
  - Метод `getSummary(userId)` → уровень, рейтинг, стрик, класс мыслителя
  - Класс мыслителя = доминирующий стат (`assignThinkerClass` в `packages/shared/src/stats/calculator.ts`)
- [ ] Написать калькулятор класса мыслителя в shared:
  - `packages/shared/src/stats/calculator.ts`
  - 5 классов: Стратег, Логик, Эрудит, Ритор, Интуит

#### Зависимости
- Бонди ждёт от Lead push-сервис для подключения на клиенте
- Lead пишет `notification.service.ts` → Яшкин пишет контроллер и БД

#### Результат недели
**Milestone 2:** Полный core loop — разминка → обучение → батл → AI-коучинг. Push-уведомления работают. Главный экран собирает всё воедино.

---

### Неделя 9 — Расширение контента (500+ вопросов)

#### Lead
- [ ] Создать AI-пайплайн генерации контента: `scripts/generate-questions.ts` (улучшенная версия)
  - Batch-генерация: 20 вопросов за один вызов Claude Sonnet
  - Автоматическая валидация формата: 4 варианта, correct_index 0-3, объяснение
  - Дедупликация: сравнение с существующими вопросами (cosine similarity на текстах)
  - Вывод: JSON + CSV для ручной ревизии
- [ ] Сгенерировать 300+ новых вопросов (до общего числа 500+)
  - 6 категорий × 3 сложности × 2 ветки
  - Баланс по категориям
- [ ] Ручная ревизия 50% вопросов (самые сложные — gold)

#### Бонди
- [ ] Создать админ-панель (фронтенд): `apps/web/app/admin/questions/page.tsx`
  - Таблица вопросов с пагинацией, фильтрами (ветка, сложность, категория)
  - Inline-редактирование текста вопроса
  - Кнопка «Деактивировать» (мягкое удаление)
  - Статус-бар: сколько вопросов по каждой категории/сложности
- [ ] Компонент `QuestionEditor`: `apps/web/components/admin/QuestionEditor.tsx`
  - Редактирование: текст, варианты, правильный ответ, объяснение
  - Preview режим

#### Яшкин
- [ ] Расширить `QuestionModule` для админки:
  - `GET /questions?page=&limit=&branch=&difficulty=&category=&status=`
  - `GET /questions/stats` — количество по категориям/сложностям
  - `PATCH /questions/:id` — обновление полей
  - `DELETE /questions/:id` — мягкое удаление (is_active = false)
- [ ] Создать эндпоинт для пользовательских жалоб:
  - `POST /questions/:id/report` — жалоба на вопрос
  - Таблица `QuestionReport`: `user_id, question_id, reason, created_at`
  - `GET /admin/reports` — список жалоб для админа
- [ ] Загрузить 500+ вопросов через `POST /questions/bulk`

#### Зависимости
- Lead генерирует вопросы → Яшкин загружает их в БД
- Бонди и Яшкин работают параллельно (фронт + бэк админки)

#### Результат недели
500+ вопросов в базе. Админ-панель для управления контентом работает. Система жалоб на вопросы.

---

### Неделя 10 — Админ-панель (доработка) + стабилизация

#### Lead
- [ ] Полная ревизия оставшихся 50% сгенерированных вопросов
- [ ] Провести код-аудит: безопасность, SQL-инъекции, rate limiting на всех эндпоинтах
- [ ] Добавить rate limiting на глобальном уровне:
  - `@nestjs/throttler` — 100 req/min на пользователя
  - Отдельные лимиты: auth = 5/min, AI = 10/min
- [ ] Настроить Redis для сессий (опционально, если JWT недостаточно)
- [ ] Обновить деплой: автоматический CI/CD через GitHub Actions → VPS
  - `deploy.yml`: build → push docker image → ssh → docker-compose pull + up

#### Бонди
- [ ] Доработать админ-панель:
  - Страница жалоб: `apps/web/app/admin/reports/page.tsx`
  - Фильтр: новые / обработанные
  - Действия: исправить вопрос / отклонить жалобу / деактивировать вопрос
- [ ] Мобильная оптимизация всех существующих страниц:
  - Проверить все экраны на 375px, 390px, 414px ширины
  - Исправить overflow, обрезание текста, мелкие кнопки
- [ ] Добавить анимации переходов между страницами (Framer Motion `AnimatePresence`)
- [ ] Добавить skeleton loaders на все страницы с данными

#### Яшкин
- [ ] Написать E2E тесты для основных API-флоу:
  - `apps/api/test/auth.e2e-spec.ts` — регистрация → логин → refresh
  - `apps/api/test/learn.e2e-spec.ts` — модули → прогресс
  - `apps/api/test/warmup.e2e-spec.ts` — разминка → стрик
- [ ] Оптимизировать SQL-запросы:
  - Добавить индексы: `Question(branch, difficulty)`, `Battle(player1_id, status)`, `UserStats(rating DESC)`
  - Проверить N+1 запросы через `prisma.$queryRaw` логи
- [ ] Добавить пагинацию во все list-эндпоинты (cursor-based для батлов, offset для вопросов)

#### Зависимости
- Все работают параллельно
- Lead деплоит обновлённый CI/CD → все проверяют работу на продакшене

#### Результат недели
Продукт стабилен. Админ-панель полностью работает. API покрыт тестами. Деплой автоматизирован.

---

### Неделя 11 — Лидерборд, социальные фичи, шеринг

#### Lead
- [ ] Создать систему инвайт-ссылок:
  - `POST /battles/challenge` — создать ссылку-вызов
  - Формат: `https://razum.app/battle/invite/{code}`
  - Ссылка открывает Telegram deep link: `https://t.me/razum_bot?start=challenge_{code}`
  - TTL 24 часа в Redis
- [ ] Настроить OG-мета для профилей:
  - Динамическая генерация OG-изображения: `apps/web/app/api/og/route.tsx`
  - Используя `@vercel/og` (Satori): имя, уровень, класс, радар-чарт
- [ ] Написать тест k6: `scripts/k6/load-test.js`
  - Сценарий: 100 пользователей → логин → разминка → создание батла
  - Целевые метрики: p95 < 500ms, 0% ошибок

#### Бонди
- [ ] Создать страницу лидерборда: `apps/web/app/(main)/leaderboard/page.tsx`
  - Табы: «За неделю» / «За месяц» / «За всё время»
  - Топ-20 по рейтингу
  - Текущая позиция пользователя (подсветка)
  - Аватар, имя, уровень, класс мыслителя, рейтинг
- [ ] Создать компонент шеринга профиля: `apps/web/components/profile/ShareButton.tsx`
  - Кнопка «Поделиться» на странице профиля
  - Web Share API (мобильный) + fallback копирование ссылки
  - Preview: OG-картинка с основными статами
- [ ] Добавить экран «Вызови друга»:
  - Кнопка на главном экране → генерация ссылки → шеринг в Telegram
  - Анимация ожидания друга

#### Яшкин
- [ ] Написать `LeaderboardService`:
  - `GET /leaderboard?type=rating&period=week` — топ-20
  - `GET /leaderboard/me?type=rating&period=week` — позиция пользователя
  - Кеширование результатов в Redis: TTL 5 мин
- [ ] Написать логику класса мыслителя:
  - Расчёт при каждом обновлении статов
  - Сохранение в `UserStats.thinker_class`
  - 5 классов: Стратег, Логик, Эрудит, Ритор, Интуит
- [ ] Добавить поле `thinker_class` в `UserStats` → миграция
- [ ] Расширить `GET /users/:id/profile` — включить `thinker_class`, позицию в лидерборде

#### Зависимости
- Бонди ждёт от Разработчика 2 API лидерборда
- Lead ждёт от Разработчика 2 расчёт `thinker_class` для OG-картинки
- Lead делает инвайт-ссылки параллельно

#### Результат недели
Лидерборд работает. Можно вызвать друга через Telegram. Профиль можно расшарить с красивой OG-картинкой. Класс мыслителя отображается.

---

### Неделя 12 — Оптимизация, тестирование, бета-запуск

#### Lead
- [ ] Провести нагрузочное тестирование (k6):
  - 100 одновременных батлов
  - 500 одновременных разминок
  - Профилировать узкие места, исправить
- [ ] Lighthouse-аудит:
  - Performance >90, Accessibility >90, Best Practices >90, PWA >90
  - Передать список проблем Разработчику 1
- [ ] Финальный security-аудит:
  - CORS настройки, Content-Security-Policy
  - Rate limiting на всех эндпоинтах
  - Проверка JWT: expiration, refresh rotation
  - SQL-инъекции (Prisma защищает, но проверить raw queries)
- [ ] Написать политику конфиденциальности: `apps/web/app/privacy/page.tsx`
- [ ] Подготовить Telegram-канал для бета-тестеров
- [ ] Координация бета-запуска: инвайт 200-500 тестеров
- [ ] Мониторинг: настроить Sentry alerts, проверить логи

#### Бонди
- [ ] Lighthouse-оптимизация:
  - Lazy loading изображений
  - Code splitting: dynamic imports для тяжёлых компонентов (Recharts, Framer Motion)
  - Оптимизация шрифтов: `next/font`
  - Минимизация CLS: placeholder для динамического контента
- [ ] Кастомный install prompt PWA:
  - Баннер «Установить РАЗУМ» после 3-го визита
  - `apps/web/components/ui/InstallBanner.tsx`
  - Сохранение dismiss в localStorage
- [ ] Финальная полировка UI:
  - Пустые состояния: «Нет батлов», «Нет диалогов»
  - Error boundaries для всех страниц
  - Offline fallback страница
- [ ] Тестирование на реальных устройствах:
  - Android Chrome, Samsung Internet
  - iOS Safari (проверить PWA ограничения)

#### Яшкин
- [ ] Финальная оптимизация БД:
  - Проверить все индексы под реальные запросы
  - EXPLAIN ANALYZE на тяжёлые запросы (лидерборд, случайные вопросы)
  - Добавить connection pooling (PgBouncer или Prisma connection pool)
- [ ] Написать скрипт создания backup: `scripts/backup.sh`
  - `pg_dump` → S3/local
  - Восстановление из backup
- [ ] Проверить все edge cases:
  - Что будет при 0 вопросов в категории?
  - Что будет при удалении пользователя?
  - Что будет при истечении JWT во время батла?
- [ ] Подготовить production seed:
  - Убедиться, что все 500+ вопросов в production БД
  - Все модули созданы и привязаны к вопросам

#### Зависимости
- Lead передаёт результаты Lighthouse Разработчику 1 в начале недели
- Все работают параллельно на финишной прямой
- **Критично:** все задачи должны быть завершены к пятнице для бета-запуска в воскресенье

#### Результат недели
**Milestone 3:** Бета-запуск. 200-500 тестеров получают доступ. Все фичи MVP работают. Мониторинг настроен.

---

## 3. Правила коммуникации

### Ежедневные стендапы
- **Время:** 10:00 МСК, 15 минут максимум
- **Формат:** каждый отвечает на 3 вопроса:
  1. Что сделал вчера?
  2. Что делаю сегодня?
  3. Есть ли блокеры?
- **Канал:** Telegram-группа команды (голосовой чат или текст)
- Если блокер не решается за 1 час — эскалация к Lead немедленно

### Процесс Code Review
1. Разработчик создаёт PR из feature-ветки в `main`
2. PR должен содержать:
   - Описание что сделано и зачем
   - Скриншот/видео для UI-изменений
   - Ссылка на задачу
3. Lead ревьюит все PR (обязательно)
4. Второй ревьюер: Бонди для frontend PR, Яшкин для backend PR (по желанию)
5. **SLA:** ревью в течение 4 рабочих часов
6. После approve — автор мёржит сам (squash merge)

### Именование веток
```
feat/RAZUM-{номер}-краткое-описание    # Новая фича
fix/RAZUM-{номер}-краткое-описание     # Багфикс
chore/RAZUM-{номер}-краткое-описание   # Инфраструктура, рефакторинг
```

Примеры:
```
feat/RAZUM-12-battle-websocket-gateway
fix/RAZUM-45-warmup-streak-reset-bug
chore/RAZUM-03-docker-compose-redis
```

### Именование коммитов
```
feat(battle): add WebSocket gateway with JWT auth
fix(warmup): fix streak reset on timezone edge case
chore(infra): add Redis to docker-compose
docs(api): add Swagger annotations to auth endpoints
```

### Работа с блокерами
1. Если задача заблокирована зависимостью — сообщить в чат немедленно
2. Переключиться на другую задачу из бэклога
3. Если блокер критический (продакшен не работает) — созвон в течение 30 минут
4. Lead имеет право переназначить задачи при блокерах

---

## 4. Definition of Done

### Для backend-задач (API endpoint)
- [ ] Endpoint реализован и отвечает корректно
- [ ] DTO с валидацией через `class-validator`
- [ ] Guard авторизации (если не публичный)
- [ ] Обработка ошибок: 400, 401, 403, 404, 409, 500
- [ ] Unit-тест на service (минимум happy path + 1 error case)
- [ ] PR прошёл CI (lint + typecheck + test)
- [ ] PR прошёл code review от Lead

### Для frontend-задач (страница/компонент)
- [ ] Компонент отображается корректно на 375px и 414px
- [ ] Тёмная тема применена
- [ ] Loading state (skeleton или spinner)
- [ ] Error state (сообщение + retry)
- [ ] Empty state (если применимо)
- [ ] Интеграция с реальным API (не моки)
- [ ] Нет console.log/console.error в коде
- [ ] PR прошёл CI (lint + typecheck)
- [ ] PR прошёл code review от Lead

### Для shared-пакетов
- [ ] Чистые функции без побочных эффектов
- [ ] Полная типизация (no `any`)
- [ ] Unit-тесты: покрытие >80%
- [ ] Экспорт через `packages/shared/src/index.ts`
- [ ] PR прошёл CI + code review

### Для инфраструктурных задач
- [ ] Docker Compose запускается с нуля за 1 команду
- [ ] CI проходит зелёным
- [ ] Документация обновлена (README или комментарии в конфиге)
- [ ] Откат возможен (для деплоя)

---

## 5. Критический путь

Ниже — задачи, которые **не могут быть сдвинуты** без сдвига всего MVP. Любая задержка на критическом пути = задержка бета-запуска.

```
Неделя 1: Монорепо инициализация (Lead)
    ↓
Неделя 2: Стейт-машина батла (Lead) + Auth API (Яшкин)
    ↓
Неделя 3: WebSocket gateway (Lead) + Battle UI (Бонди)
    ↓
Неделя 4: Матчмейкинг (Lead) + Первый деплой (Lead)
    ↓
Неделя 5-6: Модули обучения API (Яшкин) + UI (Бонди)
    ↓
Неделя 6-7: AI Service (Lead) + AI Controller (Яшкин) + Chat UI (Бонди)
    ↓
Неделя 7-8: Warmup API (Яшкин) + Главный экран (Бонди)
    ↓
Неделя 9-10: 500+ вопросов (Lead + Яшкин)
    ↓
Неделя 11-12: Лидерборд + оптимизация + бета-запуск
```

### Самые рискованные узлы

| Неделя | Задача | Риск | Митигация |
|--------|--------|------|-----------|
| 2 | Стейт-машина батла | Сложная логика, много edge cases | Lead выделяет 100% времени, юнит-тесты с первого дня |
| 3 | WebSocket gateway | Первый real-time модуль, отладка сложная | Начать с простого ping-pong, усложнять итеративно |
| 4 | Первый деплой | Непредвиденные проблемы с VPS | Иметь запасной хостинг, деплоить в начале недели |
| 6 | AI-интеграция (Claude API) | Rate limits, стоимость, качество ответов | Тестировать на Haiku (дешёвый), мокать в тестах |
| 9 | 500+ вопросов | Качество AI-генерации | Начать генерацию на неделе 8, ревьюить параллельно |
| 12 | Бета-запуск | Всё сразу может сломаться | Soft launch на 50 человек в четверг, расширение в воскресенье |

### Буферное время
- Каждая двухнедельная фаза имеет ~1 день буфера (пятница второй недели)
- Если задача с критического пути опаздывает на >2 дня — созвон команды, пересмотр приоритетов
- Фичи P2 (стрик-счётчик визуал, анимации) могут быть упрощены для экономии времени

---

## Приложение: Сводная таблица по неделям

| Неделя | Lead | Бонди | Яшкин | Milestone |
|--------|------|---------------|---------------|-----------|
| 1 | Монорепо, Docker, CI, ESLint | Next.js, тема, PWA, UI-kit | NestJS, Prisma, User schema | Монорепо запускается |
| 2 | Стейт-машина батла + тесты | Логин (Telegram + email) | Auth API, JWT, User endpoints | Auth работает, стейт-машина готова |
| 3 | WebSocket gateway, BattleService, бот | Socket.IO клиент, Battle UI (атака) | QuestionModule, seed 50 вопросов | Батл с ботом работает |
| 4 | Redis матчмейкинг, деплой VPS | Battle UI (защита, результат), профиль | StatsModule, генерация 200 вопросов | **M1:** 1v1 батл, статы, деплой |
| 5 | Стабилизация, e2e тесты батла | Страницы обучения (список + модуль) | LearnModule API, seed модулей | Модули обучения работают |
| 6 | AI service (Claude API), промпт | Полировка модулей, AI Chat UI | AI controller, DTO | AI + модули интегрированы |
| 7 | Тесты AI, кеширование, WarmupService | Подключение AI к UI, диалоги | Warmup API, стрик-логика | **M2:** Core loop замкнут |
| 8 | Push-сервис, cron-уведомления | Разминка UI, главный экран, push | NotificationModule, класс мыслителя | Главный экран, push работает |
| 9 | AI-пайплайн генерации, 300+ вопросов | Админ-панель: таблица вопросов | Расширение Question API, жалобы | 500+ вопросов, админка |
| 10 | Ревизия вопросов, security, CI/CD | Админ жалоб, мобильная полировка | E2E тесты, оптимизация SQL | Стабильный продукт |
| 11 | Инвайт-ссылки, OG-картинка, k6 | Лидерборд, шеринг, «вызови друга» | Leaderboard API, thinker_class | Соцфичи работают |
| 12 | k6 нагрузка, Lighthouse, security, запуск | PWA оптимизация, install prompt, polish | БД оптимизация, backup, edge cases | **M3:** Бета-запуск |
