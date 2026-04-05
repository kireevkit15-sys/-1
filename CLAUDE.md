# РАЗУМ — Интеллектуальная PWA-платформа

## Проект

PWA-платформа для мужчин: RPG-батлы знаний (1v1 «Осада крепости»), дерево знаний (Стратегия + Логика), AI-ассистент (сократический метод), система аватара с 5 характеристиками.

**Стек:** Next.js 14 + NestJS + PostgreSQL + Redis + Claude API + Socket.IO + Turborepo

## Структура

```
apps/web/       — Next.js PWA (frontend)
apps/api/       — NestJS (backend)
packages/shared — Чистый TypeScript (батл-логика, типы, константы)
prisma/         — Схема БД, миграции, seed
docs/           — Документация
scripts/        — CLI-утилиты (генерация вопросов)
```

## Команда и роли

В проекте 3 разработчика. При начале работы скажи свою роль, чтобы получить задачи:

### Руководитель (Lead)
- Архитектура, DevOps, Docker, CI/CD, деплой
- Батл-движок: `packages/shared/src/battle/`, WebSocket gateway, matchmaking
- AI-интеграция: `apps/api/src/ai/`
- Code review всех PR
- Нагрузочное тестирование, безопасность

### Бонди (Frontend + Дизайн)
- Всё в `apps/web/`: pages, components, hooks, styles
- UI/UX дизайн: макеты, визуальный стиль, иконки, цвета
- PWA: manifest, service worker, push, install prompt
- Mobile-first, тёмная тема, анимации
- Socket.IO клиент, интеграция с API
- Графики (Recharts), OG-изображения

### Яшкин (Backend)
- NestJS модули в `apps/api/src/`: controllers, services, DTOs
- Prisma: схема, миграции, seed
- REST API: auth, user, question, learn, stats, warmup
- Аутентификация: Telegram + email + JWT
- Админ-панель API, пайплайн контента

## Как работать с задачами

**При начале сессии разработчик должен сказать свою роль.** Claude должен:

1. Прочитать `docs/SPRINT.md` — текущий спринт с задачами по ролям
2. Показать разработчику его незавершённые задачи (статус `todo`)
3. Предложить начать с первой незавершённой задачи
4. После выполнения — обновить статус в `docs/SPRINT.md` на `done`
5. Предложить следующую задачу

**Ключевые фразы для идентификации роли:**
- «Никита», «Руководитель», «Lead», «лид» → задачи секции "Руководитель (Lead / Никита)"
- «Бонди», «Frontend», «фронт», «дизайн» → задачи секции "Бонди (Frontend + Дизайн)"
- «Яшкин», «Backend», «бэк» → задачи секции "Яшкин (Backend)"

**Если роль не указана** — спросить: «Кто ты? Никита (Lead) / Бонди (Frontend + Дизайн) / Яшкин (Backend)?»

## Документация

- Текущий спринт и задачи: `docs/SPRINT.md`
- Полное расписание на 12 недель: `docs/TASKS.md`
- Техническая архитектура: `docs/ARCHITECTURE.md`
- Дорожная карта MVP: `docs/ROADMAP.md`

## Правила разработки

- **Ветки:** `feat/RAZUM-{N}-описание`, `fix/RAZUM-{N}-описание`, `chore/RAZUM-{N}-описание`
- **Коммиты:** `feat(battle): add WebSocket gateway`, `fix(warmup): fix streak reset`
- **PR:** описание + скриншот для UI + ссылка на задачу → ревью Lead → squash merge
- **Тёмная тема:** bg `#0a0a0a`, surface `#141414`, surface-light `#1e1e1e`
- **Mobile-first:** дизайн от 375px, тестировать на 375/390/414px
- **TypeScript strict:** no `any`, полная типизация
- **Тесты:** unit для shared (>80% coverage), e2e для API
- **AI расходы:** Haiku для диалогов, Sonnet для генерации контента, жёсткие лимиты

## Команды

```bash
# Запуск
pnpm dev              # Все сервисы
docker compose up -d  # PostgreSQL + Redis

# Проверки
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
pnpm test             # Тесты

# База данных
pnpm db:generate      # Prisma generate
pnpm db:migrate       # Prisma migrate dev
pnpm db:seed          # Seed данных
```
