# РАЗУМ

Интеллектуальная PWA-платформа для мужчин. RPG-батлы знаний, дерево знаний, AI-ассистент (сократический метод).

## Быстрый старт

### 1. Клонировать

```bash
git clone https://github.com/kireevkit15-sys/-1.git
cd -1
```

### 2. Установить зависимости

```bash
pnpm install
```

> Нужен [Node.js 20+](https://nodejs.org/) и [pnpm 9+](https://pnpm.io/installation)

### 3. Запустить базы данных

```bash
docker compose up -d
```

> Нужен [Docker](https://docs.docker.com/get-docker/)
> PostgreSQL будет на `localhost:5432`, Redis на `localhost:6379`

### 4. Настроить переменные окружения

```bash
cp .env.example .env
```

Заполнить `.env` реальными значениями (см. комментарии в `.env.example`).

### 5. Применить миграции БД

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 6. Запустить

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Команды

| Команда | Описание |
|---------|----------|
| `pnpm dev` | Запуск всех сервисов в dev-режиме |
| `pnpm build` | Сборка всех пакетов |
| `pnpm lint` | Проверка ESLint |
| `pnpm typecheck` | Проверка TypeScript |
| `pnpm test` | Запуск тестов |
| `pnpm format` | Форматирование Prettier |
| `pnpm db:generate` | Генерация Prisma клиента |
| `pnpm db:migrate` | Применение миграций |
| `pnpm db:seed` | Наполнение БД тестовыми данными |

## Структура проекта

```
apps/web/         Next.js 14 PWA (frontend)
apps/api/         NestJS (backend)
packages/shared/  Общие типы и игровая логика
prisma/           Схема БД, миграции, seed
docs/             Документация
```

## Стек

Next.js 14 + NestJS + PostgreSQL + Redis + Claude API + Socket.IO + Turborepo

## Документация

- [Архитектура](docs/ARCHITECTURE.md)
- [Дорожная карта](docs/ROADMAP.md)
- [Задачи команды](docs/TASKS.md)
- [Текущий спринт](docs/SPRINT.md)
- [Журнал работы](docs/WORKLOG.md)

## Команда

| Роль | Имя | Зона |
|------|-----|------|
| Lead | Никита | Архитектура, батл-движок, AI, DevOps |
| Frontend + Дизайн | Бонди | UI/UX, страницы, PWA, анимации |
| Backend | Яшкин | API, БД, авторизация, контент |
