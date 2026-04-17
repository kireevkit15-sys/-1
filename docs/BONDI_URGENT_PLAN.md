# Срочный план работы Бонди — полный перебор сайта через скиллы

**Дата:** 2026-04-17
**Автор:** Claude (по запросу Никиты)
**Принцип:** один шаг за раз, без параллелизма, без самодеятельности. Каждый шаг — одна команда скилла и чёткая проверка. Закончил шаг → коммит → переходишь к следующему.

---

## Правила игры (прочитать и не нарушать)

1. **Перед каждой сессией:** `git pull`.
2. **Перед каждым коммитом:** `git pull`, потом `git add` → `git commit` → `git push`.
3. **1 шаг = 1 коммит.** Не копить изменения.
4. **Формат коммита:** `refactor(ui): polish <страница> via /<скилл>` + `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`.
5. **Ветка на этап:** например `feat/RAZUM-ui-audit` на весь Этап 1, `feat/RAZUM-ui-home` на весь Этап 3.1 (главная). Внутри ветки — много маленьких коммитов.
6. **PR в конце этапа**, не в середине.
7. **Не скипать `/impeccable teach` в новой сессии Claude.** Контекст сбрасывается между чатами.
8. **Каждая страница тестируется на 375 / 768 / 1440 px** (из CLAUDE.md — mobile-first).
9. **После каждого этапа — запись в `docs/WORKLOG.md`.**
10. **Не применять стилевые пресеты** (`/high-end-visual-design`, `/minimalist-ui`, `/industrial-brutalist-ui`, `/gpt-taste`, `/emil-design-eng`, `/design-taste-frontend`). У нас уже есть стиль «маскулинная агрессия» — пресеты его сломают.

---

# ЭТАП 0. Подготовка (1 раз, ~45 минут)

### Шаг 0.1 — Прочитать документацию
- [ ] Открыть [skills/README.md](../skills/README.md), прочитать целиком.
- [ ] Открыть [CLAUDE.md](../CLAUDE.md), убедиться, что помнишь правила.
- [ ] Открыть [docs/SPRINT.md](SPRINT.md) — увидеть свои закрытые задачи.

### Шаг 0.2 — Запустить локальный dev
```bash
git pull
pnpm install
docker compose up -d
pnpm dev
```
- [ ] Открыть http://localhost:3000 в браузере.
- [ ] Открыть DevTools → Toggle device toolbar → проверить 375px, 768px, 1440px.

### Шаг 0.3 — Установить контекст дизайна в Claude
В новом чате Claude Code (в корне проекта):
```
/impeccable teach
```
- [ ] Claude прочитает CLAUDE.md, tailwind.config.ts, globals.css, структуру components/ui.
- [ ] Должен отрапортовать: тёмная тема `#050505/#141414/#1e1e1e`, 5 веток с цветами, glassmorphism, mobile-first от 375px, «маскулинная агрессия».
- [ ] **Если Claude не упомянул что-то из этого — повторить `/impeccable teach` с уточнением.**

### Шаг 0.4 — Создать ветку на первый этап
```bash
git checkout -b feat/RAZUM-ui-audit-baseline
```

---

# ЭТАП 1. Базовый срез — что вообще есть (~2 часа)

Цель — получить объективную картину состояния сайта ДО любых правок. Без этого будешь чинить по ощущениям.

### Шаг 1.1 — Глобальный технический аудит
```
/audit apps/web
```
- [ ] Claude пройдёт по всем страницам, выдаст отчёт с P0–P3 проблемами.
- [ ] Сохранить отчёт в `docs/AUDIT_BASELINE.md`.
- [ ] Коммит: `chore(audit): baseline technical audit report`.

### Шаг 1.2 — Граф компонентов
```
/graphify apps/web/components
```
- [ ] На выходе — HTML-граф + `GRAPH_REPORT.md`.
- [ ] Сохранить в `docs/components-graph/` (папку создаст скилл).
- [ ] Посмотреть отчёт: где дубли компонентов? где островки без связей? Записать наблюдения в `docs/AUDIT_BASELINE.md` внизу.
- [ ] Коммит: `docs(graph): components architecture map`.

### Шаг 1.3 — Критика системы UI-компонентов (не страниц)
```
/critique apps/web/components/ui
```
- [ ] Смотреть на Button, Card, Skeleton, Toast, EmptyState, ThemeToggle, InstallBanner, SwipeToDismiss, NetworkError.
- [ ] Отчёт сохранить в `docs/UI_COMPONENTS_CRITIQUE.md`.
- [ ] Коммит: `docs(critique): ui components review`.

### Шаг 1.4 — PR этапа 1
- [ ] Запушить ветку.
- [ ] Создать PR: `chore: baseline audit + component graph`.
- [ ] Дождаться Никиты.
- [ ] Merge → `git checkout main && git pull`.

---

# ЭТАП 2. Система дизайна (~4 часа)

Цель — выровнять **фундамент** (цвет, шрифт, motion, spacing). Если фундамент кривой, полировка страниц не поможет. Делать ДО полировки страниц.

Ветка: `refactor/RAZUM-ui-design-system`.

### Шаг 2.1 — Типографика
```
/typeset
```
- [ ] Claude проверит, используется ли единая шкала размеров (`text-xs` → `text-5xl`), консистентный вес, line-height.
- [ ] Найти разнобой (например, в одном месте `text-2xl font-bold`, в другом `text-xl font-semibold` для заголовков того же уровня).
- [ ] Унифицировать через Tailwind `theme.extend.fontSize` и классы-утилиты (`.h1`, `.h2`, `.body`, `.caption`) в `globals.css`.
- [ ] Применить новые классы к 3 ключевым страницам: главная, профиль, батл.
- [ ] Визуально проверить на 375/768/1440.
- [ ] Коммит: `refactor(ui): unify typography system via /typeset`.

### Шаг 2.2 — Цветовые токены
```
/colorize
```
Здесь — НЕ раскрашивать, а проверить систему.
- [ ] Claude проверит, что цвета из `tailwind.config.ts` (5 веток: STRATEGY=cyan, LOGIC=green, ERUDITION=purple, RHETORIC=orange, INTUITION=pink) используются консистентно.
- [ ] Найти места, где используется хардкод hex (например, `bg-[#ff0000]`) вместо токенов.
- [ ] Заменить хардкоды на Tailwind токены.
- [ ] Коммит: `refactor(ui): replace hardcoded colors with design tokens`.

### Шаг 2.3 — Motion-система
```
/animate
```
- [ ] Проверить, что все transitions используют один easing (`cubic-bezier(...)`) и общую длительность 200ms (из F5.10).
- [ ] Если дубли — вынести в CSS variables (`--ease-out-razum`, `--duration-fast`, `--duration-normal`) в `globals.css`.
- [ ] Обновить Tailwind config: `transitionDuration` и `transitionTimingFunction`.
- [ ] Коммит: `refactor(ui): extract motion system tokens`.

### Шаг 2.4 — Spacing и лэйаут
```
/layout
```
- [ ] Проверить, что используется 4px/8px grid (Tailwind spacing scale).
- [ ] Найти arbitrary values (`p-[13px]`, `gap-[7px]`) — заменить на scale.
- [ ] Проверить, что max-w-3xl центровка из F5.1 соблюдается везде в `(main)`.
- [ ] Коммит: `refactor(ui): align spacing to grid`.

### Шаг 2.5 — PR этапа 2
- [ ] PR: `refactor(ui): unified design system (typography + colors + motion + spacing)`.
- [ ] Merge → `git checkout main && git pull`.

---

# ЭТАП 3. Hot path — страницы, которые видит каждый пользователь (~2 дня)

Для **каждой** страницы — один и тот же микро-пайплайн (Пайплайн B из README):

```
(a) /critique "<page>"   — UX-ревью
(b) /audit "<page>"      — технический аудит
(c) модификаторы по findings:
      /layout    если композиция сломана
      /typeset   если типографика хаотична
      /clarify   если тексты непонятные
      /distill   если перегружено
      /bolder    если безлико
      /quieter   если слишком агрессивно
      /colorize  если монохромно без причины
      /animate   если «мёртвая»
      /delight   если не хватает души
      /optimize  если лагает
(d) /adapt mobile       — проверить 375px
(e) /polish "<page>"     — финальная шлифовка
(f) /audit "<page>"      — ПОВТОРНЫЙ аудит, убедиться, что P0/P1 закрыты
(g) коммит + пуш
```

**Каждая страница — отдельная ветка.**

---

## 3.1. Главная `/` (`apps/web/app/(main)/page.tsx`) — критично

Ветка: `feat/RAZUM-ui-polish-home`.

### Шаг 3.1.1 — Критика
```
/critique "главная страница (apps/web/app/(main)/page.tsx)"
```
- [ ] Claude запустит 2 суб-агента, получит 2 независимых отчёта.
- [ ] Записать 3–5 главных проблем в комментарий к PR (draft).

### Шаг 3.1.2 — Технический аудит
```
/audit "главная страница"
```
- [ ] Записать P0 и P1 проблемы.

### Шаг 3.1.3 — Фиксы по отчётам
Применять только те модификаторы, которые нужны по findings. Приоритет:
- [ ] Если hero безлик → `/bolder "hero секция на главной"`.
- [ ] Если CTA «В бой» теряется → `/delight "CTA В бой"`.
- [ ] Если daily challenge countdown визуально слабый → `/animate "daily challenge countdown"`.
- [ ] Если layout рыхлый → `/layout "главная"`.
- [ ] Тексты микрокопи → `/clarify`.

### Шаг 3.1.4 — Мобилка
```
/adapt "главная" mobile
```
- [ ] Открыть Chrome DevTools → 375px. Проверить:
  - [ ] Нет горизонтального скролла.
  - [ ] CTA «В бой» дотягивается большим пальцем (нижние 60% экрана).
  - [ ] Hero не обрезается.
  - [ ] Статы аватара читаются.

### Шаг 3.1.5 — Полировка
```
/polish "главная"
```
- [ ] Выравнивания, отступы, консистентность с этапом 2.

### Шаг 3.1.6 — Повторный аудит
```
/audit "главная"
```
- [ ] P0 = 0. P1 = 0. Если осталось — доделать.

### Шаг 3.1.7 — Lighthouse
- [ ] В DevTools → Lighthouse → Mobile → запустить.
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1, a11y ≥ 95.
- [ ] Если не проходит → `/optimize "главная"` → повторить Lighthouse.

### Шаг 3.1.8 — Коммит + PR
- [ ] Коммит.
- [ ] PR: `refactor(ui): полировка главной через скиллы`.
- [ ] Merge.

---

## 3.2. Логин `/login` (`apps/web/app/(auth)/login/page.tsx`)

Ветка: `feat/RAZUM-ui-polish-login`.

### Шаги
- [ ] 3.2.1 `/critique "login page"`.
- [ ] 3.2.2 `/audit "login page"`.
- [ ] 3.2.3 Фиксы. Особое внимание:
  - [ ] `/clarify "login page"` — тексты ошибок (Telegram / email / password).
  - [ ] `/layout "login page"` — форма центрирована, поля читаемы.
  - [ ] Первое впечатление от бренда → проверить hero/фоновый вайб.
- [ ] 3.2.4 `/adapt mobile` — 375px, клавиатура не перекрывает поле.
- [ ] 3.2.5 `/polish`.
- [ ] 3.2.6 `/audit` повторно, 0 P0/P1.
- [ ] 3.2.7 Lighthouse.
- [ ] 3.2.8 Коммит + PR.

---

## 3.3. Батл `/battle/[id]` (`apps/web/app/(main)/battle/[id]/page.tsx`) — критично

Ветка: `feat/RAZUM-ui-polish-battle`.

Здесь уже много эффектов (shake, pulse, particle, звук удара). Риск — perf.

### Шаги
- [ ] 3.3.1 `/critique "battle screen (apps/web/app/(main)/battle/[id]/page.tsx)"`.
- [ ] 3.3.2 `/audit "battle screen"`.
- [ ] 3.3.3 **`/optimize "battle screen"` — обязательно.** Проверить FPS во время particle explosion, размер звука удара, тормозит ли shake.
  - [ ] DevTools → Performance → записать 10 секунд активного боя → должно быть ≥ 55 FPS.
- [ ] 3.3.4 Фиксы по findings (layout / animate / delight).
- [ ] 3.3.5 `/adapt mobile` — 4 кнопки ответа (1-2-3-4) достижимы пальцем, HP-бары читаются.
- [ ] 3.3.6 Проверить keyboard shortcuts 1-2-3-4 / Enter / Esc — описание видно на экране? Если нет — `/clarify`.
- [ ] 3.3.7 `/polish`.
- [ ] 3.3.8 `/audit` повторно.
- [ ] 3.3.9 Lighthouse (на реальном батле, не пустой странице).
- [ ] 3.3.10 Коммит + PR.

---

## 3.4. Поиск соперника `/battle/new` (`apps/web/app/(main)/battle/new/page.tsx`)

Ветка: `feat/RAZUM-ui-polish-battle-new`.

### Шаги
- [ ] 3.4.1 `/critique "battle matchmaking + VS screen"`.
- [ ] 3.4.2 `/audit "battle matchmaking"`.
- [ ] 3.4.3 Фиксы. Особое внимание:
  - [ ] Экран поиска с пульсирующими кольцами — не скучный? если да → `/delight`.
  - [ ] VS-экран (countdown 3-2-1) — эпичный? если нет → `/bolder` или `/animate`.
  - [ ] Error state без auth — понятен? если нет → `/clarify`.
- [ ] 3.4.4 `/adapt mobile`.
- [ ] 3.4.5 `/polish`.
- [ ] 3.4.6 `/audit` повторно.
- [ ] 3.4.7 Lighthouse.
- [ ] 3.4.8 Коммит + PR.

---

## 3.5. Профиль `/profile` (`apps/web/app/(main)/profile/page.tsx`)

Ветка: `feat/RAZUM-ui-polish-profile`.

### Шаги
- [ ] 3.5.1 `/critique "profile page"`.
- [ ] 3.5.2 `/audit "profile page"`.
- [ ] 3.5.3 Фиксы. Особое внимание:
  - [ ] RadarChart 5 статов — читается ли на 375px?
  - [ ] Rank badge с glow — заметен, но не перегружает?
  - [ ] История 10 баттлов — цвета веток консистентны?
  - [ ] XP прогресс-бар — анимируется при заходе?
  - [ ] `/layout` если перегружено.
  - [ ] `/typeset` если числа статов смешиваются с лейблами.
- [ ] 3.5.4 `/adapt mobile`.
- [ ] 3.5.5 `/polish`.
- [ ] 3.5.6 `/audit` повторно.
- [ ] 3.5.7 Lighthouse.
- [ ] 3.5.8 Коммит + PR.

---

### Контрольная точка после Этапа 3

- [ ] 5 hot-path страниц полированы.
- [ ] По каждой — PR смержен.
- [ ] Запись в `docs/WORKLOG.md` с перечислением коммитов.
- [ ] Обновить `docs/SPRINT.md`: добавить новый блок «Полировка через скиллы», отметить 5 задач как `done`.

---

# ЭТАП 4. Вторая волна страниц (~2 дня)

Те же шаги микро-пайплайна, что в этапе 3. Не буду расписывать каждый пункт — структура идентичная.

## 4.1. Дерево знаний `/learn` (`apps/web/app/(main)/learn/page.tsx`)
Ветка: `feat/RAZUM-ui-polish-learn-tree`.
- [ ] `/critique` → `/audit` → фиксы (особое внимание: визуальная карта 5 веток → 25 категорий, цвета веток из F5.5, прогресс) → `/adapt mobile` → `/polish` → `/audit` → Lighthouse → PR.

## 4.2. Экран модуля `/learn/[moduleId]` (`apps/web/app/(main)/learn/[moduleId]/page.tsx`)
Ветка: `feat/RAZUM-ui-polish-learn-module`.
- [ ] Те же шаги. Особое: переходы между вопросами, прогресс сверху, результат в конце.

## 4.3. Страница обучения `/learning` (`apps/web/app/(main)/learning/`)
Ветка: `feat/RAZUM-ui-polish-learning`.
- [ ] Те же шаги. Проверить недавний фикс demo badge (из последних коммитов).

## 4.4. AI-чат `/chat` (`apps/web/app/(main)/chat/page.tsx`)
Ветка: `feat/RAZUM-ui-polish-chat`.
- [ ] Те же шаги. Особое: `/typeset` для markdown + code blocks, `/layout` для расширенного desktop-режима.

## 4.5. Разминка `/warmup` (`apps/web/app/(main)/warmup/page.tsx`)
Ветка: `feat/RAZUM-ui-polish-warmup`.
- [ ] Те же шаги. Особое: streak counter — мотивирует ли? `/delight` если скучно. Мотивационное сообщение в конце → `/clarify`.

## 4.6. Лидерборд `/leaderboard` (`apps/web/app/(main)/leaderboard/page.tsx`)
Ветка: `feat/RAZUM-ui-polish-leaderboard`.
- [ ] Те же шаги. Особое: позиция текущего игрока подсвечена? top-3 визуально выделены?

## 4.7. Онбординг `/onboarding` (`apps/web/app/(main)/onboarding/page.tsx`)
Ветка: `feat/RAZUM-ui-polish-onboarding`.
- [ ] Те же шаги. Особое: выбор 3 любимых веток + интро-баттл с ботом. `/clarify` для инструкций. `/delight` для первого впечатления.

---

# ЭТАП 5. Полировка остального (~1 день)

Лайт-вариант микро-пайплайна: `/critique` + `/polish` без полной цепочки модификаторов. Если `/audit` чистый — сразу коммит.

## 5.1. Достижения `/achievements`
Ветка: `feat/RAZUM-ui-polish-achievements`.
- [ ] `/critique` → `/polish` → `/audit` → коммит. Особое: locked/unlocked состояния читаемы.

## 5.2. Кампании `/campaigns`
Ветка: `feat/RAZUM-ui-polish-campaigns`.
- [ ] То же.

## 5.3. Фид `/feed`
Ветка: `feat/RAZUM-ui-polish-feed`.
- [ ] То же.

## 5.4. Рефералка `/referral`
Ветка: `feat/RAZUM-ui-polish-referral`.
- [ ] То же. Особое: `/clarify` — тексты бонусов.

## 5.5. Настройки `/settings`
Ветка: `feat/RAZUM-ui-polish-settings`.
- [ ] То же. Особое: toggle звука, уведомления — иконки состояний понятны?

## 5.6. О проекте `/about`
Ветка: `feat/RAZUM-ui-polish-about`.
- [ ] То же.

## 5.7. Публичный профиль `/profile/[id]`
Ветка: `feat/RAZUM-ui-polish-profile-public`.
- [ ] То же. Проверить, что шарится корректно (OG-image).

## 5.8. Admin-панель (если она в скоупе Бонди)
Ветка: `feat/RAZUM-ui-polish-admin`.
- [ ] То же. Может быть отдельным согласованием с Никитой, нужен ли дизайн.

## 5.9. Служебные: `error.tsx`, `not-found.tsx`, `offline.tsx`
Ветка: `feat/RAZUM-ui-polish-error-pages`.
- [ ] `/critique` → `/clarify` (тексты) → `/polish` → коммит.

---

# ЭТАП 6. Финальный проход (~0.5 дня)

Здесь уже НЕТ поштучных страниц — только глобальные проверки.

Ветка: `feat/RAZUM-ui-final-pass`.

### Шаг 6.1 — Полный технический аудит по всему вебу
```
/audit apps/web
```
- [ ] Сравнить с `docs/AUDIT_BASELINE.md` из этапа 1.
- [ ] Записать разницу в `docs/AUDIT_FINAL.md`.
- [ ] P0 должно быть 0. P1 ≤ 2.

### Шаг 6.2 — Глобальный performance
```
/optimize apps/web
```
- [ ] Прогнать Lighthouse по ВСЕМ страницам (используй `lighthouserc.json` — там уже конфиг).
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1 на каждой.
- [ ] Что не проходит → локальный фикс → заново.

### Шаг 6.3 — Адаптивность всего
- [ ] На каждой странице: 375 → 390 → 414 → 768 → 1024 → 1440.
- [ ] Skip только если страница админки / служебная.
- [ ] Если нашёл баг — локальный фикс → `/adapt mobile` → коммит.

### Шаг 6.4 — Visual regression
- [ ] Запустить `apps/web/tests/visual/screenshots.spec.ts` (Playwright).
- [ ] Сравнить с предыдущими снимками. Если сильно разошлось — обновить baseline.
- [ ] Коммит: `test(visual): update screenshots after polish`.

### Шаг 6.5 — Финальный граф
```
/graphify apps/web/components --update
```
- [ ] Сравнить с базовым графом из этапа 1. Стало ли чище? Меньше островков?

### Шаг 6.6 — PR этапа 6
- [ ] PR: `chore(ui): final pass — audit + perf + visual regression`.
- [ ] Merge.

---

# ЭТАП 7. Отчёт (~1 час)

### Шаг 7.1 — Обновить SPRINT
- [ ] В `docs/SPRINT.md` добавить новый блок:
  ```
  ## Блок 12 — Полировка через скиллы
  | # | Задача | Статус | Файлы |
  |---|--------|--------|-------|
  | F12.1 | Baseline audit + component graph | done | docs/AUDIT_BASELINE.md |
  | F12.2 | Unified design system | done | globals.css, tailwind.config.ts |
  | F12.3 | Hot path pages polish (home, login, battle, battle/new, profile) | done | apps/web/app/(main)/*, apps/web/app/(auth)/* |
  | F12.4 | Second wave pages polish (learn, learning, chat, warmup, leaderboard, onboarding) | done | apps/web/app/(main)/* |
  | F12.5 | Remaining pages polish | done | apps/web/app/(main)/* |
  | F12.6 | Final pass (audit + perf + visual regression) | done | docs/AUDIT_FINAL.md |
  ```

### Шаг 7.2 — Обновить WORKLOG
- [ ] В `docs/WORKLOG.md` — одна суммарная запись со всеми коммитами по этапам 1–6.

### Шаг 7.3 — Сказать Никите
- [ ] В чате сказать: «готов к общему ревью дизайна, PR слиты, AUDIT_FINAL.md зафиксирован».

---

# Таймлайн

| Этап | Длительность | Что получается |
|---|---|---|
| Этап 0 — подготовка | ~45 мин | `/impeccable teach` установил контекст |
| Этап 1 — базовый срез | ~2 ч | `AUDIT_BASELINE.md`, граф, критика UI-компонентов |
| Этап 2 — дизайн-система | ~4 ч | Единая типографика, цвет, motion, spacing |
| Этап 3 — hot path (5 страниц) | ~2 дня | home, login, battle, battle/new, profile отполированы |
| Этап 4 — вторая волна (7 страниц) | ~2 дня | learn, learning, chat, warmup, leaderboard, onboarding |
| Этап 5 — остальное (~9 страниц) | ~1 день | achievements, campaigns, feed, referral, settings, about, profile/[id], error-страницы |
| Этап 6 — финальный проход | ~0.5 дня | `AUDIT_FINAL.md`, perf, visual regression |
| Этап 7 — отчёт | ~1 ч | SPRINT + WORKLOG обновлены |
| **Итого** | **~7 рабочих дней** | **Сайт целиком перебран** |

---

# Карта скиллов по этапам (для быстрого ориентирования)

| Скилл | Где применяется |
|---|---|
| `/impeccable teach` | Этап 0.3 — один раз на сессию |
| `/audit` | Этапы 1.1, 3.x.2, 3.x.6, 6.1 |
| `/graphify` | Этапы 1.2, 6.5 |
| `/critique` | Этапы 1.3, 3.x.1, 4.x, 5.x |
| `/typeset` | Этап 2.1 + точечно |
| `/colorize` | Этап 2.2 + точечно |
| `/animate` | Этап 2.3 + точечно |
| `/layout` | Этап 2.4 + точечно |
| `/clarify` | Точечно: логин, онбординг, рефералка, error-страницы, микрокопи |
| `/distill` | Если страница перегружена |
| `/bolder` | Если безлика (главная hero) |
| `/quieter` | Если перегружает глаза |
| `/delight` | Точечно: CTA В бой, разминка, онбординг |
| `/adapt` | Этапы 3.x.4, 4.x, 6.3 — mobile |
| `/optimize` | Этапы 3.3.3 (батл), 3.1.7 (Lighthouse), 6.2 |
| `/polish` | Завершение каждой страницы |
| `/overdrive` | **НЕ применять без согласования** с Никитой |
| `/find-skills` | Если появилась новая потребность, которой нет в текущих скиллах |
| `/full-output-enforcement` | Если Claude в середине этапа 2 (refactor) начнёт урезать код |

---

# Краткая памятка на каждый рабочий день

**Утро:**
1. `git pull`.
2. Открыть `BONDI_URGENT_PLAN.md` — найти следующую невыполненную галочку.
3. Открыть Claude Code в новом чате. Сказать: «Я Бонди, иду по `BONDI_URGENT_PLAN.md`, сейчас шаг X.Y».
4. Если сессия новая — `/impeccable teach`.

**Во время работы:**
- Один шаг — один скилл — один коммит.
- Проверил на 375/768/1440 — только потом коммит.
- `git pull` перед каждым коммитом.

**Вечер:**
- Записать в `docs/WORKLOG.md` что сделал.
- `git push`.
- Отметить галочки в этом файле.
