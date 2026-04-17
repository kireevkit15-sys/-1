# Задачи из графов знаний — распределение по команде

**Дата:** 2026-04-17
**Источник:** graphify-анализ трёх папок — `docs/`, `packages/shared/`, `apps/web/components/`.
**Как читать:** задачи ниже — это то, что обнаружил граф и что не очевидно из SPRINT.

---

## Как открыть графы в браузере

Графы — обычные HTML-файлы, работают в любом браузере офлайн, без сервера.

### Способ 1 — двойной клик (самое простое)

Открой проводник (File Explorer), перейди в папку проекта:

```
C:\Users\labut\OneDrive\Рабочий стол\Project\-1
```

Зайди в одну из трёх папок и сделай **двойной клик по `graph.html`**:

- `graphify-out-docs\graph.html` — карта документации
- `graphify-out-shared\graph.html` — карта ядра (battle/learning/stats)
- `graphify-out-components\graph.html` — карта UI-компонентов

Откроется в твоём браузере по умолчанию.

### Способ 2 — из командной строки

Из корня проекта (bash, PowerShell, или Windows Terminal):

```bash
# bash
start graphify-out-docs/graph.html
start graphify-out-shared/graph.html
start graphify-out-components/graph.html
```

```powershell
# PowerShell
Invoke-Item graphify-out-docs\graph.html
Invoke-Item graphify-out-shared\graph.html
Invoke-Item graphify-out-components\graph.html
```

### Способ 3 — перетащить в браузер

Просто перетащи `graph.html` мышью в открытое окно Chrome / Edge / Firefox.

### Что делать в графе

- **Крутить колесо мыши** — zoom in/out.
- **Тянуть мышкой** — двигать граф.
- **Кликнуть на узел** — подсветится его имя и связи.
- **Клик по легенде с цветом** — скрыть/показать целую community (цветовой кластер).
- **Hover на рёбра** — видно тип связи (EXTRACTED / INFERRED / AMBIGUOUS) и confidence.

Рядом с `graph.html` лежит **`GRAPH_REPORT.md`** — человеческий отчёт: god-nodes, surprising connections, hyperedges, suggested questions. Открывается в VS Code / любом редакторе markdown.

---

## Задачи, которые граф обнаружил

Ниже — конкретные задачи с ответственным и оценкой. Приоритет: 🔴 срочно / 🟡 важно / 🟢 при случае.

---

## 🔴 Никита (Lead) — ядро ядра

### N-GRAPH-1. Починить дубликат `buildLearningPath`
**Где:** `packages/shared/src/learning/topological-sort.ts` + `packages/shared/src/learning/path-builder.ts`
**Что граф нашёл:** две функции с одним именем и близким поведением, обе помечены как `semantically_similar_to`. Одна из них почти наверняка старая/мёртвая.
**Что сделать:**
1. Прочитать обе.
2. Понять, какая актуальная (скорее всего `path-builder.ts` — она упоминается в god-nodes как «L22.2»).
3. Вторую либо удалить, либо переименовать, если нужна отдельная семантика.
4. Обновить импорты в `packages/shared/src/index.ts`.
**Оценка:** 1–2 часа.
**Ветка:** `refactor(shared)/RAZUM-dedupe-buildLearningPath`.

### N-GRAPH-2. Унифицировать три enum-а `BRONZE/SILVER/GOLD`
**Где:**
- `packages/shared/src/battle/types.ts` → `enum Difficulty`
- `packages/shared/src/learning/types.ts` → `type DifficultyTier`
- `packages/shared/src/cards/types.ts` → `enum CardRarity`
**Что граф нашёл:** три независимых enum/type с одинаковыми значениями. Любое расхождение (добавление PLATINUM в карточки, но не в battle) молча разойдётся.
**Что сделать:**
1. Решить: это один и тот же концепт или разные? Если один — вынести в `shared/src/common/tier.ts` и переиспользовать.
2. Если разные — задокументировать в комментарии в каждом файле, почему они разные.
**Оценка:** 1 час (если объединять), 15 мин (если документировать разницу).
**Ветка:** `refactor(shared)/RAZUM-unify-tier-enums`.

### N-GRAPH-3. Проверить INFERRED-рёбра вокруг `computeAdaptations` (L22.3)
**Что граф нашёл:** `computeAdaptations()` связан с `computeConceptConfidence()` и `ADAPTIVE thresholds (0.6/0.8)` как INFERRED. Граф сам спрашивает: эти связи реальные или спекуляция?
**Что сделать:** 15-минутное чтение кода. Если связи реальные — добавить явные вызовы/комментарии. Если нет — поправить код, чтобы не сбивало с толку.
**Оценка:** 15–30 мин.

### N-GRAPH-4. Провести ревью weakly-connected узлов в shared
**Что граф нашёл:** `MAX_HP (100)`, `ROUNDS_PER_BATTLE (5)`, `ELO_DEFAULT_RATING (1000)` — слабо связаны с остальной системой. Возможно, константы вынесены, но нигде не используются как должны.
**Что сделать:** grep `MAX_HP`, `ROUNDS_PER_BATTLE`, `ELO_DEFAULT_RATING` по всему коду. Если не используются — удалить; если хардкод вместо них — заменить.
**Оценка:** 30 мин.

---

## 🔴 Бонди (Frontend + Design) — дубликаты в UI

### B-GRAPH-1. Объединить feed-карточки и learning-карточки через базовый компонент
**Что граф нашёл (surprising connections):**
- `InsightCard (feed)` ≈ `BookCard (learning)` ≈ `ExplanationCard (learning)`
- `CaseCard (feed)` ≈ `ExampleCard (learning)`
- `WisdomCard (feed)` ≈ `BookCard (learning)`
- `ChallengeCard (feed)` — god-node с 9 рёбрами

**Что сделать:**
1. Открыть `graphify-out-components\graph.html`, кликнуть на любую из feed-карточек, посмотреть связи.
2. Прочитать 2–3 пары (Insight vs Book, Case vs Example) — увидеть повторяющуюся структуру (hero-картинка, заголовок, подзаголовок, CTA).
3. Создать `apps/web/components/ui/ContentCard.tsx` — базовый компонент с props `{variant, hero, title, subtitle, cta}`.
4. Переписать дублирующиеся карточки через `<ContentCard variant="insight" ...>`.
5. Не трогать те карточки, которые уникальны (`ChallengeCard`, `ForgeCard`, `SparringCard` — у них другая структура, судя по god-node edge count).

**Оценка:** 1 день.
**Ветка:** `refactor(ui)/RAZUM-unify-content-cards`.

**Почему это срочно:** это задача **Этапа 2 плана Бонди (дизайн-система)**. Без этого полировка страниц из Этапа 3 будет чинить дубли на каждой странице отдельно — втрое дороже.

### B-GRAPH-2. Проверить weakly-connected компоненты
**Что граф нашёл:** `PageTransition (layout)`, `Lib: learning API (getStatus)`, `Lib: learning/levels (getLevelName)` — 4 слабо связанных узла. Возможно, они написаны, но никем не используются.
**Что сделать:** grep по импортам. Если компонент нигде не импортируется — удалить (мёртвый код) или интегрировать туда, где он должен работать.
**Оценка:** 20 мин.

### B-GRAPH-3. Визуальный ревью god-nodes
**Что граф нашёл:** топ-10 самых связанных компонентов. Именно они — «точки риска» при рефакторинге.
```
1. ChallengeCard (feed)      — 9 edges
2. CaseCard (feed)           — 7 edges
3. ForgeCard (feed)          — 7 edges
4. SparringCard (feed)       — 7 edges
5. BookCard (learning)       — 7 edges
6. ExplanationCard (learning)— 7 edges
7. QuestionEditor (admin)    — 6 edges
8. QuestionSourceIndicator   — 6 edges
9. ArenaCard (feed)          — 6 edges
10. InsightCard (feed)       — 6 edges
```
**Что сделать:** при полировке по Этапу 3 плана — **начинать с god-nodes**. Они используются везде, одно улучшение даст системный эффект.

---

## 🟡 Яшкин (Backend) — из графа `docs/`

### Y-GRAPH-1. Проверить актуальность схемы DB в ARCHITECTURE.md
**Что граф нашёл:** Community «Database Schema» имеет cohesion 0.14 (очень низкая). Это значит, что таблицы в документации описаны отдельно друг от друга, без явных связей. Либо документация отстала от реальности, либо граф не нашёл связей (что тоже сигнал — значит связи не описаны явно).
**Что сделать:**
1. Открыть `graphify-out-docs\graph.html`, скрыть все кластеры кроме «Database Schema».
2. Посмотреть список таблиц (DB: AiDialogue, DB: Battle, DB: BattleRound, DB: Module и т.д.).
3. Сверить с `prisma/schema.prisma` — все ли таблицы из schema упомянуты в ARCHITECTURE.md и наоборот.
4. Добавить в ARCHITECTURE.md раздел «связи таблиц» (какая таблица ссылается на какую).
**Оценка:** 30–45 мин.

### Y-GRAPH-2. Зафиксировать AI cost control
**Что граф нашёл:** `AI Cost Control (Haiku/Sonnet)` — god-node в community «Architecture & AI Integration». Критически важный, но документация про лимиты разбросана.
**Что сделать:** проверить, что в коде `apps/api/src/ai/` есть жёсткие лимиты (не только в документации). Если нет — добавить.
**Оценка:** 1 час.

---

## 🟡 Общая задача (всем) — из графа `docs/`

### DOCS-GRAPH-1. Закрыть weakly-connected узлы в документации
**Что граф нашёл:** 35 слабо связанных узлов (!). Примеры: `Serwist PWA Service Worker`, `Bot Opponent Service`, `DB: AiDialogue`.
**Интерпретация:** эти концепты упомянуты в одном документе, но нигде больше. Либо документация неполная (концепт есть в коде, но не в docs), либо концепт устарел.
**Что сделать:** каждому разработчику пройти свой список и либо развить упоминание в других docs, либо удалить, если устарело.
- Никита: все про battle, matchmaking, WebSocket, CI/CD.
- Бонди: всё про PWA, Serwist, UI, анимации.
- Яшкин: всё про DB, NestJS модули, AI.
**Оценка:** 1 час на каждого.

### DOCS-GRAPH-2. Синхронизировать SPRINT ↔ WORKLOG ↔ TASKS
**Что граф нашёл:** surprising connection «`Nikita Session 2026-04-14: content system + SPRINT tasks` --references--> `Block BC — RAG & Content Pipeline`». То есть WORKLOG ссылается на блок SPRINT. Хорошо, но граф обнаружил это как INFERRED — значит ссылки неявные.
**Что сделать:** при обновлении WORKLOG явно писать `F5.3`, `BC.2`, `L22.1` вместо описания прозой. Это даст графу EXTRACTED-рёбра и нам — navigable docs.
**Оценка:** договорённость на будущее, 0 часов сейчас.

---

## 🟢 Опциональные задачи

### OPT-1. Запустить `/graphify` на `apps/web/app` (страницы)
Граф по страницам Next.js — дополнение к графу компонентов. Даст карту: какая страница какие компоненты использует.
**Стоимость:** ~5–10 субагентов, 10 минут.
**Кому полезно:** Бонди, когда пойдёт по Этапу 3 плана (hot path полировка).

### OPT-2. Запустить `/graphify` на `apps/api/src`
Граф backend-архитектуры (NestJS модули, controllers, services).
**Стоимость:** ~15 субагентов, 20 минут.
**Кому полезно:** Яшкин и Никита.

### OPT-3. Построить объединённый граф всего проекта
```
/graphify . --mode deep
```
568 файлов, ~683k слов. **Дорого** (30–40 субагентов, 1 час). Делать, только когда проект выйдет в бета — получим полную карту системы.

---

## Порядок выполнения

**Сейчас (сегодня — завтра):**
1. Никита → N-GRAPH-1 и N-GRAPH-2 (ядро, ~3 часа).
2. Бонди → **B-GRAPH-1** (это Этап 2 плана, критично), затем Этап 3 уже по плану.
3. Яшкин → Y-GRAPH-2 (AI лимиты — безопасность).

**На этой неделе:**
4. Все трое → DOCS-GRAPH-1 (чистка weakly-connected в своих зонах).
5. Никита → N-GRAPH-3 и N-GRAPH-4.
6. Яшкин → Y-GRAPH-1.

**Потом (по необходимости):**
7. OPT-1, OPT-2 — когда понадобится свежая карта.

---

## Шпаргалка — какой граф чем полезен

| Граф | Лучший вопрос, на который отвечает |
|---|---|
| `docs/` | «Где у нас расходится документация?», «Какие концепты упомянуты только в одном месте?» |
| `packages/shared/` | «Где в ядре дубли?», «Какая функция используется всеми?», «Где INFERRED-связи требуют проверки?» |
| `apps/web/components/` | «Какие компоненты дублируют друг друга?», «Какие компоненты — god-nodes, где рефакторить рискованно?» |

---

## Как обновить граф после изменений

Когда закончишь задачу и закоммитишь — можно перестроить граф инкрементально:

```bash
# из корня проекта
# сначала удалить старые отчёты (или оставить, перезапишутся)
/graphify packages/shared --update       # инкрементально, только изменённые файлы
/graphify apps/web/components --update
/graphify docs --update
```

Старые графы в `graphify-out-docs/`, `graphify-out-shared/`, `graphify-out-components/` останутся в git-истории — всегда можно сравнить «до и после».
