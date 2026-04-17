# Components Architecture Graph

Knowledge graph UI-компонентов из `apps/web/components/` + lib-утилит. Сгенерирован через `/graphify` Никитой (17.04, commit `efd6b52`). Скопирован сюда Бонди на Этапе 1 базового среза (17.04).

## Как открыть

**Способ 1 — двойной клик:** открой `graph.html` в проводнике — откроется в браузере по умолчанию, работает офлайн.

**Способ 2 — из терминала (bash / Git Bash):**
```bash
start docs/components-graph/graph.html
```

## Что внутри

- `graph.html` — интерактивный граф (vis-network). Колесо мыши = zoom. Drag = pan. Клик по узлу = подсветка связей. Клик по легенде = hide/show community
- `graph.json` — GraphRAG-ready данные (nodes, edges с типами EXTRACTED / INFERRED / AMBIGUOUS)
- `GRAPH_REPORT.md` — человеческий отчёт: god-nodes, surprising connections, hyperedges, suggested questions

## Ключевые находки (извлечено Никитой в `docs/GRAPH_TASKS.md`)

- **B-GRAPH-1 (closed 17.04):** дубли feed ↔ learning карточек через `semantically_similar_to` — закрыто выносом `lib/branches.ts` + helper-компонентов
- **B-GRAPH-2 (closed 17.04):** 4 "слабо связанных" узла — оказались живыми (PageTransition, getStatus, getLevelName, lib/learning/)
- **B-GRAPH-3 (open):** при полировке страниц начинать с god-nodes (ChallengeCard 9 edges, CaseCard 7 edges, BookCard 7 edges, ExplanationCard 7 edges)
