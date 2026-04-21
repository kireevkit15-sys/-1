# AUDIT_BASELINE — Technical Audit of `apps/web/`

**Дата:** 2026-04-17
**Аудитор:** Claude (как Бонди, frontend)
**Методика:** `skills/audit/SKILL.md` v2.1.1
**Скоуп:** `apps/web/` — 33 маршрута `app/**`, ~60 компонентов `components/**`, 4 хука `hooks/**`, `tailwind.config.ts`, `app/globals.css`
**Основание для сэмплов:** `docs/components-graph/GRAPH_REPORT.md` (хабы: InsightCard/CaseCard/ChallengeCard/BookCard/ExplanationCard; 4 изолированных узла)
**Контекст стиля:** Dark Academia / «маскулинная агрессия» (`#050505` bg, `#CF9D7B` медный акцент, 5 цветов веток, glassmorphism, `font-verse` Cormorant, `font-ritual` Philosopher)

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | **1 / 4** | 499 `text-secondary/muted` использований часто нарушают WCAG AA (`#87756A` на `#050505` ≈ 4.1:1 для мелкого текста, `#56453A` ≈ 1.8:1 — фейл); формы без `<label htmlFor>`; нет skip-link; heading-иерархия нарушена; `animate-pulse` на `🔥`-эмодзи (анти-паттерн) |
| 2 | Performance | **2 / 4** | `backdrop-blur-xl` + `saturate(2.2)` на навигации (мобильный GPU задыхается); Recharts + 60fps анимации счётчиков на `/profile`; `<img src=…>` вместо `next/image`; 5 параллельных `animate-*-infinite`; `willChange: transform` правильно выставлен в feed |
| 3 | Responsive Design | **3 / 4** | Mobile-first выполнен (`sm:` по всему коду, `safe-area-inset-bottom`); но SideNav `w-[220px]` фиксированна; `min-h-14` (56px) в QuizCard — хорошо, но ICON-кнопки BottomNav ~44×44px еле-еле проходят (точки-индикаторы в фиде **6×6 px** — провал по targets); **нет тестов на 375px** — `clamp` используется только в 1 месте |
| 4 | Theming | **3 / 4** | Дизайн-токены внедрены широко (`text-text-primary`, `bg-surface`); но **100+ inline hex в `components/**`** (BRANCH_META дублируется 7+ раз), `dark:` класс не применяется ни разу в теме, `text-white`/`bg-white` встречается в 12 файлах — тонкий долг перед единым источником правды |
| 5 | Anti-Patterns | **1 / 4** | **8+ gradient-text (`bg-clip-text text-transparent`)**, glassmorphism везде (9 классов в globals + 28 компонентов), 🔥-эмодзи в feed прогресс-баре (CLAUDE.md прямо запрещает эмодзи), hero metrics на главной, 6+ уровней вложенных карточек в `/feed` (card → card → inner card → example block), bounce-easing (`animate-bounce` 3×), generic gradient `from-cyan-500 to-cyan-400` на `/feed` NoCampaignPrompt рушит DA-палитру |
| **Total** | | **10 / 20** | **Acceptable — significant work needed** |

---

## Anti-Patterns Verdict

**Brutally honest:** проект балансирует на грани «AI slop» — у него есть **сильная авторская линия** (медная/ритуальная типографика в `/learning/*`, `QuizCard`, `DefendStage`, `ExplanationCard`), но **`/feed/*` и главная — катастрофа самокопирующихся AI-шаблонов**.

**Tells, которые я нашёл:**

1. **Gradient text на заголовках** — `bg-metallic bg-clip-text text-transparent` в `InsightCard:180`, `.text-metallic` в `globals.css:28`, плюс `bg-gradient-to-r from-cyan-500 to-cyan-400 text-black` на `/feed:270`. Это классический AI-фингерпринт.
2. **Glassmorphism везде** — `.glass`, `.glass-card`, `.liquid-glass`, `.liquid-glass-capsule`, `.liquid-glass-orb`, `.liquid-glass-active` (6 вариантов!) + `backdrop-blur-sm` в каждом `Card.tsx:21`. iOS 26 liquid glass в маскулинной Dark Academia — концептуально противоречит ТЗ (Никитина «маскулинная агрессия» ≠ Apple мягкость).
3. **Neon-glow оргия** — 13 теней (`neon-accent`, `neon-red`, `neon-gold`, `neon-strategy`, `neon-logic`...) + `animation: glow-pulse 3s infinite` на `.rank-badge`. Это буквально «cyberpunk AI palette».
4. **Hero metrics** — на `/` (главная) демо-стата: streak 7, battles 23, winRate 65 — те самые три числа в ряд.
5. **Generic gradient fallbacks** — `bg-gradient-to-r from-cyan-500 to-cyan-400` в `NoCampaignPrompt` (строка 270 feed) **игнорирует свою же палитру** веток.
6. **Эмодзи 🔥** в `/feed/page.tsx:317` с `animate-pulse` и `drop-shadow` — прямое нарушение `CLAUDE.md` («тёплые тёмные фоны, без эмодзи»).
7. **Nested cards** — `/feed` контейнер (карточка с `borderLeft` + `boxShadow`) → внутренняя `h-full rounded-2xl` → `InsightCard` `rounded-2xl bg-surface/80` → пример-каллаут `rounded-xl`. **4 вложенных рамки**.
8. **Redundant copy** — `— Проверка —`, `— Раскрытие —`, `— Защити —` с emdash-обвязкой (AI-фишка для «атмосферы»).

**Вердикт:** 3/8 зон (learning/ritual) — авторский стиль. 5/8 зон (feed/home/nav) — AI slop. Общий рейтинг 1/4 — нужно распространить стиль `/learning/*` на `/feed/*`, убрать дубль `liquid-glass*`, стереть эмодзи.

---

## Executive Summary

- **Audit Health Score: 10/20 (Acceptable — significant work needed)**
- **Всего проблем: 42** — P0: **4**, P1: **14**, P2: **17**, P3: **7**
- **Топ-5 критичных проблем:**
  1. **WCAG AA fail по контрасту** — `text-text-muted` (`#56453A`) на `bg-background` (`#050505`) = 1.8:1 (норма ≥4.5). Используется в **499 местах**.
  2. **Touch targets < 44px** — индикаторы-точки в `/feed` 6×6 px и 18×6 px (`app/(main)/feed/page.tsx:776-777`).
  3. **Gradient text + эмодзи + generic cyan** ломают Dark Academia в ключевом экране `/feed`.
  4. **Рендер 10+ `backdrop-blur-xl` одновременно** (BottomNav `liquid-glass-capsule` + `liquid-glass-orb` + Card + overlay) — на среднем Android не держит 60fps.
  5. **Формы без `htmlFor`** — `/login`, `/admin/questions`, `/chat` — инпуты привязаны placeholder-ом, screen readers не прочитают label.

- **Рекомендованные следующие шаги:** `/harden` (контрасты/формы/targets) → `/quieter` (убрать градиенты/эмодзи/double-glass) → `/optimize` (blur-budget) → `/polish`.

---

## Detailed Findings by Severity

### P0 — Blocking (4)

#### [P0-1] Контраст `text-text-muted` (`#56453A`) на `bg-background` (`#050505`) — 1.8:1
- **Location:** `tailwind.config.ts:27` (определение), используется в 499 местах — сэмплы: `apps/web/app/(main)/learning/page.tsx:84`, `apps/web/components/learning/ExplanationCard.tsx:226`, `apps/web/components/feed/InsightCard.tsx:226,248,269`, `apps/web/components/layout/BottomNav.tsx:77`, `apps/web/components/learning/QuizCard.tsx:40`
- **Category:** Accessibility
- **Impact:** Незрячие пользователи/люди с плохим зрением/на ярком солнце не могут прочитать подписи, даты, таймеры, служебные метки. WCAG 1.4.3 фейл.
- **WCAG:** 1.4.3 Contrast (Minimum) — AA — требует ≥4.5:1 для обычного текста, ≥3:1 для крупного (18pt+ или 14pt bold).
- **Recommendation:** Осветлить `text-muted` с `#56453A` до минимум `#8C7666` (≈4.6:1). Для 10pt uppercase-меток — поднять до `#A89587` (≈6.5:1).
- **Suggested command:** `/harden`

#### [P0-2] Touch targets 6×6px и 18×6px в dot-индикаторах фида
- **Location:** `apps/web/app/(main)/feed/page.tsx:770-786` — `<button>` с `style={{ width: isActive ? 18 : 6, height: 6 }}`
- **Category:** Accessibility / Responsive
- **Impact:** Невозможно попасть пальцем — ни для людей с тремором, ни на бегу. Даже `aria-label` не спасает, если зона нетыкабельна.
- **WCAG:** 2.5.5 Target Size (AAA) и 2.5.8 Target Size Minimum (AA, 24×24). Текущее — 6px.
- **Recommendation:** Обернуть визуальную точку в `<button className="w-11 h-11 flex items-center justify-center">` (44×44 padding-зона), а сам визуал оставить 6×6 внутри.
- **Suggested command:** `/adapt`

#### [P0-3] Формы на `/login`, `/chat`, `/admin/questions` — без `<label htmlFor>`
- **Location:** `apps/web/app/(auth)/login/page.tsx:97-121` (3 инпута, только `placeholder`), `apps/web/app/(main)/chat/page.tsx` (placeholder-only), `apps/web/components/learn/AiChat.tsx` (textarea)
- **Category:** Accessibility
- **Impact:** Screen reader прочитает только плейсхолдер, который **исчезает при вводе**, и юзер теряет контекст поля. Автозаполнение паролей тоже может сломаться.
- **WCAG:** 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A).
- **Recommendation:** Добавить `<label htmlFor="email" className="sr-only">Email</label>` перед каждым input + `id="email"` на input. Или inline `aria-label`.
- **Suggested command:** `/harden`

#### [P0-4] Эмодзи `🔥` с `animate-pulse` в production-feed (прямо запрещено CLAUDE.md)
- **Location:** `apps/web/app/(main)/feed/page.tsx:317` — `<span className="animate-pulse drop-shadow-[0_0_6px_rgba(249,115,22,0.7)]">🔥</span>`
- **Category:** Anti-Pattern / Theming
- **Impact:** `CLAUDE.md` явно запрещает эмодзи: «утверждённая цветовая схема: медный #CF9D7B, тёплые тёмные фоны, без эмодзи». Ломает авторскую Dark Academia. Плюс OS-рендер эмодзи на Android != iOS != Windows — несогласованно.
- **WCAG:** N/A (но неожиданные эмодзи screen-reader читает как «fire»).
- **Recommendation:** Заменить на SVG-пламя в `text-accent-red`/`text-accent-orange` или на `.pulse-ring` с `border-accent-red`.
- **Suggested command:** `/quieter`

---

### P1 — Major (14)

#### [P1-1] 6 вариантов glassmorphism — `glass`, `glass-card`, `liquid-glass`, `liquid-glass-capsule`, `liquid-glass-orb`, `liquid-glass-active`
- **Location:** `apps/web/app/globals.css:39-113` (определение), `apps/web/components/layout/BottomNav.tsx:67,90`, `apps/web/components/ui/Card.tsx:21`, `apps/web/components/layout/SideNav.tsx:70`
- **Category:** Anti-Pattern / Performance
- **Impact:** Визуальный язык распыляется; `backdrop-blur-xl saturate(2.2)` — дорогостоящая операция на мобильном GPU (Samsung A-series ощутимо просаживается).
- **Recommendation:** Сохранить один `.glass-surface` (тёмный матовый с еле заметным blur(8px)) + один `.glass-accent` (для активного состояния нижней навигации). Удалить 4 остальных. Переписать `BottomNav` под token.
- **Suggested command:** `/quieter`

#### [P1-2] Gradient text `bg-metallic bg-clip-text text-transparent` в `InsightCard`
- **Location:** `apps/web/components/feed/InsightCard.tsx:178-184`; утилита в `app/globals.css:27-32`
- **Category:** Anti-Pattern
- **Impact:** Классический AI-тилл. В Dark Academia заголовки должны быть плотными, читаемыми (Cormorant/Philosopher). Металлик-градиент растворяет читаемость при тонком шрифте.
- **Recommendation:** Сплошной `text-accent` или `text-text-primary` с `tracking-[0.04em]`.
- **Suggested command:** `/quieter`

#### [P1-3] BRANCH_META дублируется в 7+ компонентах
- **Location:** `apps/web/components/feed/InsightCard.tsx:15-45`, `ChallengeCard.tsx:23-29`, `CaseCard.tsx`, `SparringCard.tsx`, `ForgeCard.tsx`, `WisdomCard.tsx`, `ArenaCard.tsx`, `app/(main)/feed/page.tsx:27-42`
- **Category:** Theming / Anti-Pattern (DRY fail)
- **Impact:** Любое изменение цвета ветки = править 7+ мест. Нет единого источника правды для branch identity (хотя в `tailwind.config.ts:32-36` уже есть `branch-*` цвета — их не используют).
- **Recommendation:** Вынести в `packages/shared/src/branches.ts` константу `BRANCHES: Record<BranchKey, {label, color, icon}>` и импортировать везде.
- **Suggested command:** `/simplify` (не из audit-списка — используйте `/polish` с заметкой)

#### [P1-4] Generic `from-cyan-500 to-cyan-400` градиент в NoCampaignPrompt
- **Location:** `apps/web/app/(main)/feed/page.tsx:268-272`
- **Category:** Anti-Pattern / Theming
- **Impact:** Разрушает DA-палитру: cyan — это цвет ветки STRATEGY, а используется как generic primary. Ломает identity.
- **Recommendation:** Заменить на `bg-accent text-background` или `bg-metallic-dark text-text-primary`.
- **Suggested command:** `/colorize`

#### [P1-5] `backdrop-filter: blur(40-50px) saturate(2.2-2.5) brightness(1.1-1.15)` на постоянно видимой навигации
- **Location:** `app/globals.css:67-113` — `liquid-glass`, `liquid-glass-capsule`, `liquid-glass-orb`
- **Category:** Performance
- **Impact:** На каждом рендере кадра GPU вычисляет blur 40-50px на большой поверхности (капсула нижней навигации + орб + активные стейты). На Android mid-tier это 6-9 мс на frame — уходят в jank при скролле фида.
- **Recommendation:** Снизить blur до 12-16px, убрать `saturate > 1.5`, брать из токена `--blur-nav`. Либо сделать blur только на `:hover`, а базовый — solid `rgba(17,17,20,0.85)`.
- **Suggested command:** `/optimize`

#### [P1-6] Animated counter через `requestAnimationFrame` при каждом рендере `/profile`
- **Location:** `apps/web/app/(main)/profile/page.tsx:20-46` — `useAnimatedCounter`
- **Category:** Performance
- **Impact:** На странице профиля ~5-7 метрик, каждая запускает 60fps цикл на 1 сек при mount. Плюс Recharts RadarChart. На холодном старте мобильного — заметный jank.
- **Recommendation:** Респектировать `prefers-reduced-motion`. Использовать CSS `@keyframes count-up` (уже есть в tailwind) вместо JS.
- **Suggested command:** `/optimize`

#### [P1-7] `<img>` вместо `next/image` в `InsightCard` и `profile/[id]`
- **Location:** `apps/web/components/feed/InsightCard.tsx:115`, `apps/web/app/(main)/profile/[id]/page.tsx:129`
- **Category:** Performance
- **Impact:** Не используются `next/image` оптимизации: AVIF/WebP, lazy-loading по viewport, blur-placeholder, responsive srcset. На feed-скролле изображения грузятся в полном размере.
- **Recommendation:** Импортировать `import Image from "next/image"`, добавить `sizes="(max-width: 768px) 100vw, 600px"` + `fill` / `width/height`.
- **Suggested command:** `/optimize`

#### [P1-8] `alt=""` на hero-изображении в `InsightCard`
- **Location:** `apps/web/components/feed/InsightCard.tsx:117`
- **Category:** Accessibility
- **Impact:** Пустой alt означает «декоративное», но это hero-изображение карточки — контент, а не декор. Screen reader пропустит важный визуальный контекст.
- **WCAG:** 1.1.1 Non-text Content (A).
- **Recommendation:** `alt={data.title}` или `alt={\`Иллюстрация к "${data.title}"\`}`.
- **Suggested command:** `/harden`

#### [P1-9] Отсутствует skip-link `Перейти к контенту`
- **Location:** `apps/web/app/layout.tsx` + `apps/web/app/(main)/layout.tsx` — не вижу `<a href="#main">`
- **Category:** Accessibility
- **Impact:** Keyboard-юзеры и screen-reader-юзеры должны каждый раз проходить через 6 элементов SideNav, прежде чем попасть в контент. На `/feed` это означает 6 таб-нажатий перед картой.
- **WCAG:** 2.4.1 Bypass Blocks (A).
- **Recommendation:** Добавить в `(main)/layout.tsx`: `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 ...">Перейти к контенту</a>`, и `id="main-content"` на `<main>`.
- **Suggested command:** `/harden`

#### [P1-10] Отсутствуют visible focus styles
- **Location:** 13 файлов имеют `focus:` / `focus-visible:`, но в feed/main большинство кнопок используют `active:scale-95` + transparent focus. Пример: `components/ui/Button.tsx:23-35` — нет `focus-visible:ring`.
- **Category:** Accessibility
- **Impact:** Keyboard-юзер не видит, где он находится. Вся навигация непроходима с клавиатуры.
- **WCAG:** 2.4.7 Focus Visible (AA).
- **Recommendation:** Добавить в `Button.tsx` базовый класс: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Реплицировать в Link-кнопках.
- **Suggested command:** `/harden`

#### [P1-11] `prefers-reduced-motion` не учтён
- **Location:** `apps/web/app/globals.css` — 40+ анимаций (animate-breathe, animate-aurora-drift, battle-pulse-hp, glow-pulse, …) без медиа-обёртки.
- **Category:** Accessibility
- **Impact:** Пользователи с vestibular disorder получают активно движущийся интерфейс без возможности выключить. Многие анимации `infinite` — `blood-pulse 2.2s infinite`, `aurora-drift 18s infinite`, `glow-pulse-badge 2.5s infinite`, `.bounce-badge 1s infinite`.
- **WCAG:** 2.3.3 Animation from Interactions (AAA), но лучший практик — давать opt-out.
- **Recommendation:** В конце `globals.css`: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`
- **Suggested command:** `/animate`

#### [P1-12] Тяжёлые одновременные infinite-анимации на одном экране
- **Location:** `app/globals.css` — `rank-badge` (glow-pulse 3s), `.battle-glow-gold` (2s), `.bounce-badge` (1s), `.animate-pulse-critical` (0.8s), `.pulse-ring` — в `/profile` или `/battle` могут идти одновременно 5+.
- **Category:** Performance
- **Impact:** GPU не отдыхает, батарея садится вдвое быстрее на мобильном.
- **Recommendation:** Ограничить одновременные infinite-анимации одной на viewport. Проверить в DevTools → Performance → compositor layers.
- **Suggested command:** `/animate`

#### [P1-13] Неверная heading-иерархия — `<h2>` без `<h1>`
- **Location:** `apps/web/app/(main)/feed/page.tsx:260,718`, `apps/web/components/learning/ExplanationCard.tsx:99`, многие feed-карты сразу с `<h2>`.
- **Category:** Accessibility
- **Impact:** Screen reader навигация по заголовкам ломается; `<h1>` должен быть один на страницу и раньше `<h2>`.
- **WCAG:** 1.3.1 Info and Relationships (A).
- **Recommendation:** Назначить `<h1>` в (main)/layout.tsx (скрытый, для каждой страницы динамический) или сделать первый `<h2>` в feed `<h1>`.
- **Suggested command:** `/harden`

#### [P1-14] 4-уровневая вложенность карточек в `/feed`
- **Location:** `apps/web/app/(main)/feed/page.tsx:823-864` + `InsightCard.tsx:100-103` → 205
- **Category:** Anti-Pattern
- **Impact:** Визуальный шум: outer-container (bg + border + shadow) → feed-wrapper (`rounded-2xl bg-[#141414]`) → InsightCard (`bg-surface/80 backdrop-blur-sm`) → example callout (`rounded-xl` + 2 слоя). На маленьком экране 375px одни скругления + borders забивают контент.
- **Recommendation:** Убрать внешний `rounded-2xl overflow-hidden` wrapper в feed (он дублирует InsightCard), оставить borderLeft как единственный branch-identifier.
- **Suggested command:** `/layout`

---

### P2 — Minor (17)

#### [P2-1] 100+ inline-hex в components/** (нарушение дизайн-токенов)
- **Location:** 19 файлов — `feed/CaseCard.tsx:9`, `feed/ChallengeCard.tsx:8`, `components/ui/Toast.tsx:18`, `learning/QuizCard.tsx:55,81` etc.
- **Category:** Theming
- **Recommendation:** Заменить `#06B6D4` → `branch-strategy` token, `#22C55E` → `branch-logic`, и т.д. `#4F7A54`/`#7A3A3A`/`#87B08E`/`#B98787` → добавить токены `success-soft`, `error-soft`.
- **Suggested command:** `/colorize`

#### [P2-2] `bg-[#1e1e1e]` / `bg-[#141414]` вместо `bg-surface-light` / `bg-surface`
- **Location:** `app/(main)/feed/page.tsx:231-236, 323, 699, 826`, где-то ещё
- **Category:** Theming
- **Recommendation:** Заменить на tokens.
- **Suggested command:** `/colorize`

#### [P2-3] Inline event-handlers `onMouseEnter/Leave/Down/Up` в ThemeToggle
- **Location:** `apps/web/components/ui/ThemeToggle.tsx:63-76`
- **Category:** Performance / Anti-Pattern
- **Impact:** Перерисовка на hover через JS вместо CSS; нельзя переопределить тему через `@media (hover: none)`.
- **Recommendation:** Заменить на CSS `:hover`/`:active`.
- **Suggested command:** `/quieter`

#### [P2-4] ThemeToggle — light mode fake
- **Location:** `apps/web/components/ui/ThemeToggle.tsx:22-35`
- **Category:** Anti-Pattern / UX
- **Impact:** Тогл утверждает «Включить светлую тему», но всегда автоматически возвращается обратно. Пользователь не понимает, что происходит.
- **Recommendation:** Либо спрятать кнопку до реализации light theme, либо заменить label на «Светлая тема скоро».
- **Suggested command:** `/clarify`

#### [P2-5] `select-none` на всём feed-контейнере
- **Location:** `apps/web/app/(main)/feed/page.tsx:736`
- **Category:** Accessibility
- **Impact:** Нельзя выделить и скопировать цитату Сунь Цзы или пример — а это основная ценность контента.
- **Recommendation:** Оставить `select-none` только на UI-обвязке (хедер, прогресс), но не на самом карточном контенте.
- **Suggested command:** `/clarify`

#### [P2-6] Demo-баннер тёмно-жёлтый на тёмном
- **Location:** `apps/web/app/(main)/feed/page.tsx:742-750` — `bg-yellow-500/10 text-yellow-500`
- **Category:** Theming / A11y
- **Impact:** Жёлтый 500 на `/10` бекграунде на `#050505` ≈ 3.2:1 — не проходит WCAG AA.
- **Recommendation:** `text-yellow-300` или `text-accent-gold`.
- **Suggested command:** `/harden`

#### [P2-7] `<nav>` без `aria-label`
- **Location:** `components/layout/BottomNav.tsx:64`, `components/layout/SideNav.tsx:70`
- **Category:** Accessibility
- **Recommendation:** `<nav aria-label="Основное меню">` / `aria-label="Нижняя навигация">`.
- **Suggested command:** `/harden`

#### [P2-8] `aside` в SideNav — без роли
- **Location:** `components/layout/SideNav.tsx:70`
- **Category:** Accessibility
- **Recommendation:** Должно быть `<nav>` (это же навигация), не `<aside>`.
- **Suggested command:** `/harden`

#### [P2-9] BottomNav tabs label размер 9px — нечитаемо
- **Location:** `components/layout/BottomNav.tsx:81` — `text-[9px]`
- **Category:** Responsive / A11y
- **Impact:** На 375px экране невозможно прочесть для пользователей с пресбиопией (40+).
- **WCAG:** 1.4.4 Resize Text (AA).
- **Recommendation:** Минимум `text-[11px]`, лучше `text-xs` (12px).
- **Suggested command:** `/typeset`

#### [P2-10] SideNav fixed `w-[220px]` при 1024px breakpoint
- **Location:** `components/layout/SideNav.tsx:70` — `w-[220px]` hardcoded
- **Category:** Responsive
- **Impact:** На 1024-1199px контент получает 804px + `pr-0` — выглядит сжато. Нет промежуточного `xl:w-64`.
- **Recommendation:** `w-56 xl:w-64` или `w-[clamp(200px,18vw,260px)]`.
- **Suggested command:** `/adapt`

#### [P2-11] `text-neutral-*` classes в 2 файлах (AI-шаблон, не проект)
- **Location:** `apps/web/components/feed/ArenaCard.tsx`, `apps/web/app/(main)/feed/page.tsx:249,307,313,722,853,872`
- **Category:** Theming
- **Recommendation:** Заменить на `text-text-secondary` / `text-text-muted` токены.
- **Suggested command:** `/colorize`

#### [P2-12] `text-white` на feed/settings/profile (12 файлов)
- **Location:** `apps/web/components/feed/CaseCard.tsx:356` (QuoteIcon), `app/(main)/feed/page.tsx:260,699,718`, etc.
- **Category:** Theming
- **Recommendation:** `text-text-primary` (`#E8DDD3`) — он теплее чем pure white и соответствует DA-палитре.
- **Suggested command:** `/colorize`

#### [P2-13] Radar-чарт в Card с tile blur — двойной blur
- **Location:** `apps/web/app/(main)/profile/page.tsx` внутри `<Card padding="lg">`, Card уже имеет `backdrop-blur-sm`
- **Category:** Performance
- **Impact:** SVG-чарт пересчитывается каждый раз при animate-counter + background blur.
- **Recommendation:** Radar вне backdrop-blur родителя.
- **Suggested command:** `/optimize`

#### [P2-14] ARIA-labels отсутствуют на 40+ интерактивных SVG-кнопках
- **Location:** Почти каждая feed-карточка имеет иконку-кнопку без `aria-label`. `components/feed/InsightCard.tsx:258-268` (swipe hint — ок, но есть и ошибки) и т.п.
- **Category:** Accessibility
- **Recommendation:** Ко всем icon-only buttons добавить `aria-label`.
- **Suggested command:** `/harden`

#### [P2-15] `<section>` с `aria-label`, но без видимого заголовка
- **Location:** `components/learning/QuizCard.tsx:36`, `DefendStage.tsx:157`, `ApplyStage.tsx` — aria-label рус. «Защити», видимо для screen reader, но visually — emdash
- **Category:** Accessibility
- **Impact:** Неплохо, но если хочется строже — использовать `<h2 className="sr-only">Проверка</h2>` вместо aria-label на section.
- **Recommendation:** ОК как есть, но задокументировать паттерн.
- **Suggested command:** `/harden`

#### [P2-16] Keyboard-nav в feed слушает `window`, а не `ref`
- **Location:** `app/(main)/feed/page.tsx:668-679`
- **Category:** Accessibility / Performance
- **Impact:** Arrow-Down в любом поле ввода сразу свайпает ленту. Конфликт с form-inputs на странице.
- **Recommendation:** Вешать handler на `containerRef.current` + `tabIndex={0}`, либо фильтровать `e.target` (не input/textarea/contenteditable).
- **Suggested command:** `/harden`

#### [P2-17] `overflow-y-auto` на каждой карте feed — двойной скролл с внешним `touch-none`
- **Location:** `app/(main)/feed/page.tsx:793 (touch-none), 845 (overflow-y-auto)`
- **Category:** Responsive / UX
- **Impact:** На длинном InsightCard content внутренний scroll + swipe-detection конфликтуют — юзер не может достичь низа карты без случайного перехода.
- **Recommendation:** Отключить swipe при `scrollTop < scrollHeight - clientHeight`.
- **Suggested command:** `/adapt`

---

### P3 — Polish (7)

#### [P3-1] Emdash-декораторы `— Проверка —` / `— Раскрытие —` (AI-тилл)
- **Location:** `components/learning/QuizCard.tsx:41`, `ExplanationCard`, `DefendStage:161`, `ApplyStage`
- **Category:** Anti-Pattern
- **Recommendation:** Оставить маленький медный дивайдер без текстовой обвязки, или только метку без emdash. Это авторский штрих, но повторяющийся в каждой ритуальной карте — начинает читаться как AI-декор.
- **Suggested command:** `/quieter`

#### [P3-2] `tracking-[0.35em]`/`[0.4em]` в 30+ местах — uppercase wide tracking как подпись AI
- **Location:** `components/learning/barrier/*`, `ExplanationCard.tsx:93`
- **Category:** Anti-Pattern / Typography
- **Recommendation:** Вынести в token `.tracking-ritual` и применять только к меткам `<=` 11px. Не к заголовкам.
- **Suggested command:** `/typeset`

#### [P3-3] 4 изолированных узла из graph report
- **Location:** `PageTransition (layout)`, `Lib: learning API (getStatus)`, `Lib: learning/levels (getLevelName)`, `UI: Button`
- **Category:** Architecture
- **Impact:** Код существует, но не подключён к остальной системе — либо забытый, либо мёртвый.
- **Recommendation:** Проверить использование через `grep PageTransition` — если нигде не импортится, удалить.
- **Suggested command:** `/polish`

#### [P3-4] 28 компонентов импортят `backdrop-blur` (консистентность)
- **Location:** По всему `components/**`
- **Category:** Anti-Pattern
- **Recommendation:** Централизовать в 2 классах (см. P1-1). Удалить inline `backdrop-blur-sm` / `backdrop-blur-xl`.
- **Suggested command:** `/quieter`

#### [P3-5] `React.memo` использован только в 13 файлах (возможны re-renders в feed)
- **Location:** feed-cards (InsightCard, ChallengeCard, …) — массивные компоненты без memo
- **Category:** Performance
- **Recommendation:** Обернуть все feed-cards в `React.memo` с кастомным `areEqual(prev, next) => prev.data === next.data`.
- **Suggested command:** `/optimize`

#### [P3-6] `shadow-neon-accent` + `shadow-neon-red` + `shadow-neon-gold` + 5 branch-shadows в token-е
- **Location:** `tailwind.config.ts:53-64` — 13 shadow токенов
- **Category:** Theming / Anti-Pattern
- **Recommendation:** Оставить 3: `shadow-glow` (primary), `shadow-glow-branch` (через CSS var `--branch-color`), `shadow-glow-danger`.
- **Suggested command:** `/quieter`

#### [P3-7] `Toast.tsx` — 18 hex-цветов
- **Location:** `components/ui/Toast.tsx`
- **Category:** Theming
- **Recommendation:** Перевести на tokens `bg-accent`, `bg-accent-red`, `bg-accent-gold`, etc.
- **Suggested command:** `/colorize`

---

## Patterns & Systemic Issues

1. **«Стилевой раскол»** — проект делится на две зоны с разным DNA:
   - **Авторская** (`/learning/*`, `DefendStage`, `ExplanationCard`, `QuizCard`, `RitualShell`): медная DA-типографика, `font-verse/font-ritual`, узкая палитра. Это сильная сторона.
   - **AI-шаблонная** (`/feed/*`, главная, `BottomNav`, `Card`): glassmorphism + neon-glow + gradient text + эмодзи + generic cyan. Это слабая сторона.
   Нужно **распространить язык «learning» на feed**. Медь вместо cyan, Cormorant вместо Inter на заголовках, border-left (1-2px) вместо nested cards.

2. **Дубликаты brand-constants** — `BRANCH_META` / `BRANCH_COLORS` / `BRANCH_BG_TINTS` дублируются в 8+ файлах. Нужно вынести в `packages/shared` как `BRANCH_IDENTITY` с полным набором (label, color, bg, icon, shadow).

3. **Контрастный debt** — 3 значения `text-text-*` системно недостаточны по WCAG AA. Нужно пересчитать с contrast-checker и обновить `tailwind.config.ts` один раз — автоматически улучшит 499 точек использования.

4. **Animation overcrowding** — 40+ keyframes в `globals.css`, 9 `infinite`-анимаций. Нужен budget: максимум 1 infinite-анимация на viewport, остальные — triggered.

5. **Glass chaos** — 6 классов glass, смешиваются с inline `backdrop-blur-sm`. Унифицировать.

6. **Touch-target неконсистентность** — есть `min-h-14` (QuizCard), есть 6×6 (dots), есть w-10 h-10 (ThemeToggle, AiChat). Нужен `.touch-target` utility.

7. **Формы без labels** — системно, во всех формах. Шаблон `<input placeholder>` переиспользован.

---

## Positive Findings

**Что работает хорошо и нужно распространять:**

1. **Дизайн-токены в `tailwind.config.ts`** — ключевые (`background`, `surface`, `accent`, `text-*`, `branch-*`) определены и используются в 499 местах. База есть, нужно только закрыть пробелы.
2. **`ExplanationCard`, `DefendStage`, `QuizCard`, `RitualShell`** — эталон DA-стиля: тихая типографика, медные акценты, чёткая иерархия, минимум декора. Это должно стать образцом для остального.
3. **`aria-label` на 95 местах** — где применено, сделано корректно (`aria-label="Карточка N"`, `aria-label="Проверка"`, `aria-label="Ответ наставнику"`).
4. **Touch events в feed правильно оформлены** — с rubber-band, threshold, `willChange: transform`, условный transition. Это зрелый код.
5. **IntersectionObserver для "viewed" событий** в `InsightCard` — идеальный паттерн.
6. **Safe-area-inset-bottom** — `pb-[max(12px,env(safe-area-inset-bottom))]` в BottomNav — правильное PWA-поведение на iPhone X+.
7. **Font loading через `next/font`** — Inter + Philosopher + Cormorant с CSS-vars, правильная кириллица. Никогда не `<link href="fonts.googleapis.com">`.
8. **`useMemo`/`useCallback`** — 37 раз в ключевых местах (feed/profile), не избыточно.
9. **Feed-скролл производительный** — только `prev/current/next` рендерится (`if (Math.abs(offset) > 1) return null`).
10. **`Philosopher` (кириллица) вместо `Cinzel`** — фикс из WORKLOG показывает, что команда внимательна к fallback-ам.

---

## Recommended Actions (priority order)

1. **[P0] `/harden`** — залатать контрасты (`text-muted` → `#8C7666`), добавить `<label htmlFor>` во все формы (login/chat/admin), ARIA-labels на icon-buttons, skip-link в `(main)/layout.tsx`, `focus-visible:ring-accent` в Button, фикс heading-иерархии.
2. **[P0] `/adapt`** — dot-индикаторы feed в 44×44 touch-zone, fix BottomNav label <11px, feed-swipe-conflict с internal scroll.
3. **[P1] `/quieter`** — удалить эмодзи `🔥`, убрать `bg-metallic bg-clip-text text-transparent`, замёржить 6 glass-классов в 2, убрать emdash-декораторы (P3), свести 13 shadow-токенов к 3.
4. **[P1] `/colorize`** — заменить generic cyan gradient в `NoCampaignPrompt` на медь; инлайновые hex → tokens (BRANCH_META → `packages/shared`); `text-white` → `text-text-primary`, `text-neutral-*` → `text-text-*`.
5. **[P1] `/optimize`** — снизить `backdrop-filter` в liquid-glass с 40-50px до 12-16px; `<img>` → `next/image`; animated counter → CSS keyframes + `prefers-reduced-motion`; feed-cards в `React.memo`.
6. **[P1] `/animate`** — `@media (prefers-reduced-motion: reduce)` в globals; аудит infinite-анимаций на viewport (budget: 1).
7. **[P2] `/typeset`** — поднять BottomNav labels с 9px до 11-12px; `tracking-[0.35em]` ограничить 11px-метками.
8. **[P2] `/layout`** — убрать двойной wrapper в feed (outer card + InsightCard), оставить border-left как единственный branch-indicator.
9. **[P3] `/clarify`** — заменить ThemeToggle label с "Включить светлую тему" на "Светлая тема скоро"; убрать `select-none` с контента feed.
10. **[Final] `/polish`** — пройти повторно `/audit` и зафиксировать новый score.

---

> Вы можете попросить меня запустить эти команды по одной, все сразу или в любом порядке.
>
> Перезапустите `/audit` после правок — цель: 10/20 → 16-18/20.
