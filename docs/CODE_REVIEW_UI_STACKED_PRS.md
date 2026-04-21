# Code Review — UI stacked PRs + learning system

**Дата:** 2026-04-21
**Ревьюер:** Никита (Lead)
**Задачи:** L2.5 (code review недели 2), L25.7 (review PR системы обучения от Бонди и Яшкина)

---

## 1. UI stacked PRs #2–#6 (Бонди, 17.04)

Пять веток в `refactor/RAZUM-ui-*`, stacked как цепочка: ui-tokens → button-api → p1-followup → p2-polish → p3-polish. Мерджить строго в этом порядке.

### Dry-run merge
Все 5 веток мёрджатся в main **без конфликтов** (проверено `git merge --no-commit --no-ff`).

### Вердикт по каждой ветке

| # | Ветка | Коммит | Вердикт | Комментарий |
|---|-------|--------|---------|-------------|
| PR #2 | `refactor/RAZUM-ui-tokens` | `ca8fe5d` | ✅ approve | Чистое введение CSS-переменных в `:root`. Tailwind привязан через `rgb(var(--token) / <alpha-value>)` — старые классы типа `bg-accent/20` работают без правок. Правильно выделены `--color-*`, `--radius-*`, `--duration-*`. Заложен хук для light-темы (комментарий про `[data-theme="light"]`). |
| PR #3 | `refactor/RAZUM-button-api` | `fbd1ca6` | ✅ approve | Новое API Button: `size` (sm/md/lg), `loading` со Spinner + `aria-busy`, `leftIcon`/`rightIcon`/`iconOnly`, варианты `ghost`/`outline`/`link`. Обратная совместимость 100%. `focus-visible:ring` — закрывает WCAG 2.4.7. +13 тест-кейсов. |
| PR #4 | `refactor/RAZUM-ui-p1-followup` | `f044ec2`, `c0f04af` | ✅ approve | ThemeToggle: убрано фейк-переключение, `aria-disabled` вместо `disabled` (Safari-Tab-skip фикс). `globals.css` utility-классы (`.glass-card`, `.tier-*`, `.cta-battle`, `.rank-badge`) переведены на токены. |
| PR #5 | `refactor/RAZUM-ui-p2-polish` | `9ff26f4`, `4682fce`, `509c9c8`, `b564c88` | ✅ approve | NetworkError → `onRetry` callback вместо `window.location.reload()` (сохраняет state формы). EmptyState → optional CTA. SwipeToDismiss → кнопка-крестик для desktop/keyboard (30-40% PWA-юзеров застревали). Toast → `action` prop + `duration`. Overload сохраняет совместимость со старым `showToast(msg, "xp")`. |
| PR #6 | `refactor/RAZUM-ui-p3-polish` | `fab3c61`, `2f72d42`, `be34bcc` | ✅ approve | InstallBanner — реальная иконка вместо «P». `.card-shell` как общая база (placeholder не дёргается при замене). **Critical review закрывает 7 багов:** `type="button"` по умолчанию (был submit), `loading` без `opacity-50`, ThemeToggle `aria-disabled` + раздельные hover/focus + `aria-describedby`, `stopPropagation` на крестике SwipeToDismiss, `type="button"` на всех кнопках Toast/NetworkError/InstallBanner, убран `priority` с InstallBanner (показывается только на 3-й визит). |

### Минорные замечания (не блокируют merge)
- `{...props}` идёт после `disabled`/`aria-busy` в Button — outside props могут перезаписать. Низкий риск, стабильный паттерн.
- `focus-visible:ring-offset-background` требует `background` как валидного Tailwind-цвета — OK, `globals.css` токены это обеспечивают.
- `.card-shell` утилита определена в `globals.css` — нет типа для проверки покрытия через ESLint. Приемлемо для CSS-утилит.

### Рекомендация
**Мёрджить в порядке stack.** GitHub автоматически переставит base каждой следующей PR после merge предыдущей.

---

## 2. Ветка `refactor/RAZUM-unify-content-cards` (Бонди, 17.04)

| Коммит | Описание |
|--------|----------|
| `617e5bf` | `lib/branches.ts` как source of truth — BRANCHES, BranchBadge, SwipeHint, FeedCardShell |
| `63a405b` | Миграция feed-карточек и pages на `lib/branches.ts` |
| `609c44a` | Запись в WORKLOG |

### Вердикт
✅ approve с **мёрдж-конфликтом в `docs/WORKLOG.md`** (обе стороны добавили записи). Код-конфликтов нет (проверено `git merge-tree`). Конфликт тривиально разрешается принятием обеих записей.

### Замечание
Полезная унификация: устраняет 5 дублированных мест, где хардкодились `BRANCH_COLORS` и `BRANCH_LABELS` (campaigns, feed, profile и др.). Теперь единый источник — `lib/branches.ts`.

---

## 3. Система обучения (L25.7)

Ревью post-merge коммитов Бонди (F20–F28, 36 задач) и Яшкина (B20–B25, 40+ задач) в main.

### Бонди — фронтенд обучения
- ✅ **F20 (определение пути)**: холодный пролог, 5 ситуаций, `Cinzel → Philosopher` (Cinzel не поддерживал кириллицу — правильный фикс).
- ✅ **F21–F23 (главный экран, лента урока, слои глубины)**: `RitualShell`, `LevelIcon`, 8 типов карточек (Hook, Explanation, Evidence, Example, Quiz, Explain, Thread, Wisdom), scroll-snap лента. IntersectionObserver для прогресса N/M — правильный выбор.
- ✅ **F24 (барьер)**: 5 стадий (recall → connect → apply → defend → verdict), конечный автомат, бордовая aurora-атмосфера отличает от обычного урока.
- ✅ **F25–F26 (карта знаний + AI-наставник)**: сетка концептов с 4 уровнями усвоения, bottom-sheet чат с наставником.
- ✅ **F27 (интеграция с батлами)**: BattleUnlockCard, QuestionSourceIndicator, BottomNav/SideNav → /learning.
- ✅ **F28 (тестирование)**: 25 E2E + 15 visual baselines + 10 a11y. 55/55 passed.
- ✅ **F28.10 (Lighthouse + a11y)**: 5 URL `/learning/*`, `numberOfRuns: 3`, `data-testid` селекторы вместо Tailwind arbitrary.

**Претензии:**
- Color-contrast отключён в axe: `text-muted` (#56453A) и `cold-blood` (#8B2E2E) дают 2.3–2.5:1 на тёмных фонах. Задокументировано, но нужен ручной аудит — **добавить в F-POLISH.2.2** (в блок F-POLISH уже упоминается `/colorize`).
- Visual baselines сгенерированы на Windows. При первом CI-прогоне нужно `--update-snapshots`.
- `determination-situations.json` bundled — если контент сменится, тесты упадут. **Техдолг:** `page.route()` + fixtures.

### Яшкин — бэкенд обучения
- ✅ **B20 (модели + миграции)**: 7 Prisma-моделей (Concept, ConceptRelation, UserConceptMastery, LearningPath, LearningDay, LevelBarrier, DepthLayer) + 2 enum (LevelName, BarrierStage). Миграция чистая.
- ✅ **B21 (LearningModule API)**: 9 эндпоинтов — determine, start, today, status, interact, explain, depth, day/complete. AuthenticatedRequest интерфейс через JwtAuthGuard.
- ✅ **B22 (барьер API)**: 7 эндпоинтов — recall → connect → apply → defend → complete + логика пересдачи (определение слабых тем).
- ✅ **B23 (граф знаний API)**: `/concepts` с фильтрами, `/concepts/:id/related` с типами связей, `/learning/mastery` — карта усвоения.
- ✅ **B24 (сиды)**: 184 концепта, 8 типов связей, слои глубины для 6 концептов, карточки на 17 дней, 5 ситуаций определения.
- ✅ **B25 (тестирование)**: 37 E2E + 32 unit + 22 security тестов. Cross-user isolation покрыт в security-тестах. k6 load (100 concurrent learners) — прошло.

**Претензии:** Нет. Код качественный, типизация полная, AuthenticatedRequest применён везде.

---

## 4. Итог

| Задача | Статус | Действие |
|--------|--------|----------|
| L2.5 — code review PR недели 2 | ✅ done | — |
| L25.7 — code review системы обучения | ✅ done | Замечания добавлены как техдолг в F-POLISH |
| L4.5 — тестирование с 5-10 людьми | ⏳ blocked | Нужны физические тестеры. Никита готовит инвайт-список. |

### Merge-план
1. `refactor/RAZUM-ui-tokens` → main (squash merge)
2. `refactor/RAZUM-button-api` → main
3. `refactor/RAZUM-ui-p1-followup` → main
4. `refactor/RAZUM-ui-p2-polish` → main
5. `refactor/RAZUM-ui-p3-polish` → main
6. `refactor/RAZUM-unify-content-cards` → main (разрешить конфликт в WORKLOG, принять обе записи)

После мерджа Бонди может начинать **F-POLISH.0** (см. SPRINT.md — блок F-POLISH).

### Откроется после L4.5
- N4 (SSL) уже `done`, но реальный деплой на VPS ещё не делали (нет записи в WORKLOG).
- Sentry не подключён (упоминание в ROADMAP, нет задачи).
- Production секреты (JWT_SECRET, Claude API key, Telegram bot token) — заглушки в `.env.example`.

**Рекомендация Никите:** перед L4.5 создать задачи D1–D5 «Реальный деплой на VPS» — Docker Compose prod, nginx, Let's Encrypt, Sentry, production secrets rotation.
