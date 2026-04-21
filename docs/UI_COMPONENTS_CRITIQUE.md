# UI Components UX-Критика

**Дата:** 2026-04-17
**Скоуп:** `apps/web/components/ui/` — 9 компонентов (Button, Card, Skeleton, Toast, EmptyState, ThemeToggle, InstallBanner, SwipeToDismiss, NetworkError)
**Методика:** `skills/critique/SKILL.md` v2.1.1 — упрощённый проход без browser automation
**Контекст проекта:** РАЗУМ PWA, тёмная тема, медный акцент `#CF9D7B`, glassmorphism, mobile-first ≥375px
**Свежие компоненты:** `BranchBadge.tsx`, `SwipeHint.tsx`, `FeedCardShell.tsx` — отсутствуют в файловой системе, в отдельной ветке Бонди → не оценены.

---

## ⚠ Поправка от 2026-04-21 — иерархия эстетик

Эта критика писалась в предположении, что «маскулинная агрессия» — основной язык платформы. На сессии `/impeccable teach` (21.04.2026) иерархия была уточнена и зафиксирована в `.impeccable.md`:

- **Dark Academia — основной язык (~85% экранов).** Мягкие радиусы, медный акцент, Cormorant для эпиграфов, glassmorphism точечно. UI-примитивы (Button, Card, Toast, Skeleton, EmptyState) по умолчанию живут в этой эстетике — они появляются везде, включая обучение/AI/профиль/лидерборд/главную.
- **Маскулинная агрессия — модальный режим (~15%).** Только `/battle/*`, `/battle/new` и ритуальные стадии Barrier Flow. Прямые углы, cold-blood/cold-steel, тяжёлые анимации.

**Что это меняет в выводах ниже:**

1. **«Слишком мягкий визуальный словарь» — частично снимается.** Мягкие `rounded-2xl`, `shadow-glass`, медный `backdrop-blur` — это КОРРЕКТНО для DA-режима, то есть для ~85% экранов. Жёсткие углы и боевая ритмика нужны **не везде**, а только в MA-вариантах примитивов на боевых экранах.
2. **Новый техдолг:** примитивам нужен **MA-вариант** (`<Button variant="battle">`, `<Card variant="battle">` и т.д.), чтобы на `/battle/*` можно было переключить форму на прямые углы + cold-blood бордеры, не ломая DA по умолчанию.
3. **Пер-компонентные технические находки ниже (отсутствие `loading`, `size`, `aria-label`, расползание палитры, hardcoded hex, фейковый ThemeToggle, `NetworkError` с `reload()`) — остаются в силе, они не зависят от эстетического направления.**

Читая разделы ниже, мысленно замени «нужно добавить когтей везде» на «нужно добавить MA-вариант для боевого контекста, DA оставить основой».

---

## Executive summary

Базовый UI-слой написан грамотно с точки зрения React-инженерии (forwardRef, aria-live, touch handling, SSR-safety), но на уровне дизайн-системы страдает от двух болезней: **двух параллельных стилевых диалектов** (Tailwind-классы vs inline `style={{}}`) и **расползания палитры** — пять компонентов кодируют акцентные цвета hardcoded rgb-строками, игнорируя токены темы. Для мужской PWA с заявленной "маскулинной агрессией" визуальный словарь слишком мягкий: везде `rounded-2xl`, мягкие `shadow-glass`, `backdrop-blur-20`, редко — углы, жёсткие линии, или рваная ритмика. Общий entry barrier пользователя низкий, но и "когтей" у системы нет. Компоненты-примитивы (`Button`, `Card`) занижены по функциональности: нет `loading`, нет `size`, нет `icon`, нет iconButton — реальные продакшен-паттерны будут эти примитивы обходить. Состояния покрыты неравномерно: `EmptyState` есть, а `ErrorState` общего назначения — нет (только `NetworkError` под конкретный кейс).

> **Читать в свете поправки выше:** «слишком мягкий словарь» касается не всего UI, а только **отсутствия MA-варианта примитивов для боевого контекста**. Сама мягкость DA-режима — корректна.

---

## AI Slop Verdict

**Вердикт:** **SOFT FAIL** (slop-признаки присутствуют, но не тотально)

**Что выдаёт AI-генерацию:**
- Glassmorphism везде (`bg-surface/80 backdrop-blur-sm` в Card, `backdropFilter: blur(20px)` в Toast, `.glass-card` в EmptyState и NetworkError) — без каких-либо "не-glass" контрпримеров
- Универсальные `rounded-2xl` и `rounded-xl` — ни один компонент не использует острые углы, разные радиусы или асимметричные формы
- `shadow-lg shadow-accent/20 hover:shadow-neon-accent hover:-translate-y-0.5` на primary Button — классический AI-паттерн "glow + float-up on hover"
- EmptyState: иконка в квадрате с 2 слоями box-shadow (24px + 60px) — generic "ambient glow" рецепт
- Цветные SVG-иконки в Toast (gold/purple/orange/red) с `fillOpacity 0.3` + stroke — точно тот же pattern что Linear/Cron и 50 AI-клонов
- NetworkError: modal с центральной иконкой в square-chip, заголовок, сабтекст, одна кнопка — самая стандартная AI-композиция ошибки

**Что спасает:**
- Нет gradient text, нет hero metrics, нет фиолетово-розовых градиентов ("AI-палитра" отсутствует)
- Медный `#CF9D7B` — нестандартный и узнаваемый акцент, не берётся из default Tailwind
- Toast и Empty State имеют продуманную типизацию и микрокопию на русском
- Слово "баттл" и микрокопия типа "Сразись с соперником и докажи свои знания!" — небанальные, в тоне

**Вердикт заказчику:** если показать 10 дизайнерам, 6 скажут "выглядит как AI-компоненты из v0.dev / shadcn-fork". Спасает медный акцент и русская микрокопия, но форма компонентов — generic.

---

## Per-component findings

| Компонент | Оценка | Ключевые issues |
|---|---|---|
| **Button.tsx** | 6/10 | Нет `size` prop; нет `loading`; нет `icon`/`iconOnly`; всего 3 варианта (нет `ghost`, `outline`); `px-6 py-3` захардкожено — невозможно сделать компактную кнопку |
| **Card.tsx** | 5/10 | Только `padding` prop — нет `variant` (elevated/flat/outline/interactive), нет `hover` состояния, нет `onClick` semantics; glassmorphism вшит и не отключается |
| **Skeleton.tsx** | 7/10 | Базовая часть ок; но `SkeletonCard` и `SkeletonStats` с зашитым border `border-accent/10` — нарушает composition, лучше передавать через props или использовать реальный Card |
| **Toast.tsx** | 7/10 | Сильная логика (queue, MAX 3, aria-live); но 80% стилей — inline `style={{}}` вместо Tailwind, не синхронизировано с остальными компонентами; нет `action` prop (undo); цвет `info` (`#87756A`) слишком тусклый — info-тосты будут теряться |
| **EmptyState.tsx** | 6/10 | Хардкод 5 типов — не расширяется без правки компонента; использует `as never` для обхода типизации (тех.долг); `accentRgb` дублирует `accentColor` (парсер rgb); нет CTA-кнопки — пустой экран без действия |
| **ThemeToggle.tsx** | 4/10 | **Anti-pattern:** кнопка фейкового переключения (light пока не реализован) — возвращает пользователя обратно через 2.5с молча. Это нарушает Heuristic 1 (visibility of system status) и 5 (error prevention). Лучше либо disabled с tooltip, либо вообще спрятать |
| **InstallBanner.tsx** | 6/10 | Буква "P" в квадрате вместо иконки приложения — заглушка в продакшене; нет `aria-label` на dismiss; не учитывает iOS (`beforeinstallprompt` не срабатывает в Safari — iOS-юзер никогда не увидит баннер) |
| **SwipeToDismiss.tsx** | 7/10 | Хорошая touch-логика с threshold и snap-back; но **только свайп вправо**, нет левого свайпа; нет keyboard/mouse альтернативы (desktop-юзер застрянет); `drag indicator bar` всегда виден даже если пользователь не знает о свайпе |
| **NetworkError.tsx** | 5/10 | Fullscreen-модалка на каждую сетевую ошибку — слишком агрессивно; только ловит `online` event, не ловит `offline` event (не показывается по триггеру, только если инициализирован как `visible=true`); `window.location.reload()` — деструктивно, теряет state формы |

---

## Heuristic scores (0-4 per component)

Строки = компоненты, колонки = 10 эвристик Нильсена:
- **H1** Visibility of System Status
- **H2** Match Real World
- **H3** User Control & Freedom
- **H4** Consistency & Standards
- **H5** Error Prevention
- **H6** Recognition vs Recall
- **H7** Flexibility & Efficiency
- **H8** Aesthetic & Minimalist
- **H9** Error Recovery
- **H10** Help & Documentation

| Компонент | H1 | H2 | H3 | H4 | H5 | H6 | H7 | H8 | H9 | H10 | Σ/40 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Button | 3 | 3 | 3 | 3 | 2 | 3 | 1 | 3 | 2 | 1 | **24** |
| Card | 2 | 3 | 3 | 3 | 3 | 3 | 1 | 3 | — | 1 | **22** |
| Skeleton | 4 | 3 | — | 2 | 3 | 3 | 1 | 3 | — | 1 | **20** |
| Toast | 4 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 3 | 1 | **27** |
| EmptyState | 3 | 4 | 2 | 2 | 3 | 3 | 1 | 3 | — | 2 | **23** |
| ThemeToggle | 1 | 3 | 2 | 2 | 1 | 3 | 1 | 3 | 1 | 1 | **18** |
| InstallBanner | 3 | 3 | 3 | 3 | 3 | 3 | 1 | 3 | 2 | 1 | **25** |
| SwipeToDismiss | 2 | 3 | 2 | 2 | 2 | 2 | 1 | 3 | 2 | 1 | **20** |
| NetworkError | 2 | 3 | 1 | 2 | 1 | 3 | 1 | 3 | 2 | 1 | **19** |

**Average: 22.0/40** → **"Acceptable"** band (20-27). Significant improvements needed before users are happy.

---

## Patterns & inconsistencies

### 1. Две параллельные стилевые системы
В одном и том же слое `ui/`:
- **Tailwind-first** — Button, Card, Skeleton, InstallBanner (чистый `className`)
- **Inline-style-first** — Toast, ThemeToggle, NetworkError, частично EmptyState (`style={{ background: ..., border: ... }}`)
- **Mixed** — SwipeToDismiss (Tailwind + inline для transform)

Следствие: любая правка палитры требует искать по двум местам; темизация через CSS-переменные заблокирована для inline-стилевых.

### 2. Расползание палитры
Одинаковые семантические цвета записаны по-разному:
- Accent медный: `bg-accent` (Button), `rgb(207, 157, 123)` (ThemeToggle), `rgba(207, 157, 123, 0.25)` (ThemeToggle tooltip), `#CF9D7B` (Toast XP icon), `rgba(185,141,52,0.4)` (Toast XP border) — **пять разных записей одного цвета**
- Error red: `bg-accent-red` (Button), `#C0392B` (Toast), `rgba(220, 38, 38, ...)` (NetworkError), `rgba(192, 57, 43, 1)` (EmptyState battles) — **четыре разных красных**
- Info grey: `text-text-muted` vs `#87756A` vs `#56453A` — три значения

### 3. Несогласованность радиусов и бордеров
- Toast: `borderRadius: "14px"` (не из Tailwind шкалы)
- Button: `rounded-xl` (12px)
- Card: `rounded-2xl` (16px)
- EmptyState icon box: `rounded-2xl`
- Toast close button: `borderRadius: "4px"`
- ThemeToggle: `rounded-xl`

Нет единой сетки радиусов. `14px` — аномалия.

### 4. Borders — пять разных способов
- `border border-white/[0.05]` (Card)
- `border border-white/[0.06]` (Button secondary)
- `border: '1px solid rgba(255,255,255,0.08)'` (ThemeToggle)
- `border border-accent/10` (SkeletonCard)
- `border border-accent/20` (InstallBanner)

Пяти разных border-alpha для одной семантики "тонкая граница".

### 5. Не все компоненты покрывают свои состояния
| Компонент | loading | empty | error | disabled | hover | focus | active |
|---|---|---|---|---|---|---|---|
| Button | ❌ | — | — | ✅ | ✅ | ❌ (нет focus-visible) | ✅ |
| Card | — | — | — | — | ❌ | ❌ | — |
| Toast | — | ✅ | — | — | ✅ (close btn) | ❌ | — |
| EmptyState | — | ✅ (сам empty) | — | — | — | — | — |
| Skeleton | ✅ | — | — | — | — | — | — |

Нет ни одного компонента с явным `focus-visible` стилем — провал accessibility для клавиатурной навигации.

### 6. Hardcoded магические значения
- `setTimeout(..., 3000)` в Toast — не конфигурируется
- `setTimeout(..., 2500)` в ThemeToggle
- `MAX_TOASTS = 3` — в коде
- `threshold = 100` в SwipeToDismiss — prop, но `threshold * 2.5` — магия внутри
- `visits < 3` в InstallBanner

### 7. i18n готовность: 0/10
Все строки на русском языке зашиты в компоненты. Нет i18n-обёртки. `"Закрыть"`, `"Уведомления"`, `"Установить РАЗУМ"`, все EmptyState presets — при добавлении английского придётся переписывать компоненты.

---

## Priority issues

### [P1] ThemeToggle — фейк-переключение через 2.5с
**Что:** Кнопка делает вид, что переключает тему, через 2.5 секунды молча возвращает темную.
**Почему:** Нарушение доверия — пользователь видит, как его выбор отменяется. Нет реального обучения, нет обратной связи "почему". Tooltip "Светлая тема скоро" не останется на экране — исчезнет вместе с "откатом".
**Фикс:** Либо сделать disabled с постоянным tooltip ("Скоро"), либо убрать кнопку до реализации. Фейковый toggle хуже отсутствия toggle'а.

### [P1] Button примитив слишком слабый для продакшена
**Что:** Нет `size` (sm/md/lg), нет `loading` state со спиннером, нет `leftIcon`/`rightIcon`/`iconOnly`, нет `ghost`/`outline` вариантов.
**Почему:** Фичи (батл, warmup, learn) начнут рендерить inline-кнопки или обёртывать Button в кастом — потеря консистентности и accessibility.
**Фикс:** Расширить API — `size: 'sm' | 'md' | 'lg'`, `loading: boolean`, `leftIcon?: ReactNode`, `iconOnly?: boolean`, variants: `+ 'ghost' | 'outline' | 'link'`.

### [P1] Палитра кодируется hardcoded rgb — расползается
**Что:** Один и тот же цвет записан 3-5 способами в разных компонентах (см. секцию Inconsistencies #2).
**Почему:** Нельзя менять тему/палитру централизованно. Риск визуального рассогласования при UI-правках.
**Фикс:** Вывести CSS-переменные (`--color-accent`, `--color-error`, `--color-xp`, `--border-subtle`) в `globals.css`, переписать inline `rgb(...)` через `var(--token)`. Все компоненты с inline `style={{ background: 'rgba(...)' }}` должны читать из CSS-переменных.

### [P1] Нет focus-visible стилей — клавиатурная навигация сломана
**Что:** Ни один из 9 компонентов не определяет `:focus-visible`. Tab по интерфейсу не показывает, где фокус.
**Почему:** Нарушение WCAG 2.1 SC 2.4.7 (Focus Visible), блокер для a11y аудита PWA, часть пользователей (клавиатура, screen reader) не сможет пользоваться сайтом.
**Фикс:** Добавить `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60` в Button, ThemeToggle, Toast close, InstallBanner кнопки. В Tailwind тему добавить единый ring-стиль.

### [P2] NetworkError разрушает пользовательский контекст
**Что:** Fullscreen модалка + `window.location.reload()` по кнопке "Повторить" → теряется state (например, недописанное сообщение AI-ассистенту).
**Почему:** Сетевые глюки в PWA частые (метро, лифт). Каждый потерянный стейт — отток.
**Фикс:** (а) Сделать не fullscreen, а компактный toast/banner сверху; (б) Кнопка "Повторить" = retry, не reload — через переданный callback; (с) Сохранять `formData` в sessionStorage перед reload при необходимости.

### [P2] EmptyState без CTA — тупик
**Что:** "Ещё нет баттлов / Сразись с соперником" — но **нет кнопки "Найти соперника"**. Пустой экран не ведёт к действию.
**Почему:** Пустые экраны — самая важная точка онбординга. Без CTA пользователь не знает, что делать, и уходит.
**Фикс:** Добавить optional `actionLabel?: string; onAction?: () => void;` prop. На главных пустых экранах (battles, achievements, history) — обязательный CTA.

### [P2] SwipeToDismiss не работает с клавиатурой/мышью
**Что:** Свайп только вправо, только touch events. Desktop-пользователь (их 30-40% PWA-юзеров) не может закрыть карточку факта.
**Почему:** Исключает целый класс пользователей.
**Фикс:** Добавить кнопку-крестик `×` в правый верхний угол карточки (снаружи или поверх). Кнопка использует тот же `triggerDismiss`. Touch-свайп — accelerator поверх обычной кнопки, не замена.

### [P2] Toast нет action-prop (undo)
**Что:** Toast автозакрывается через 3с, нет способа приложить к нему действие ("Undo", "View", "Retry").
**Почему:** Для "XP +50 получено" хочется "Посмотреть". Для "Баттл отменён" — "Отменить отмену". Современные toast-либы (sonner, react-hot-toast) это дают из коробки.
**Фикс:** Расширить API: `showToast(message, { type, action?: { label: string; onClick: () => void }, duration?: number })`.

### [P3] InstallBanner: "P" вместо иконки
**Что:** В PWA-баннере буква "P" в квадрате. Это явная заглушка.
**Почему:** Выглядит как dev-вариант, неаккуратно для продакшена.
**Фикс:** Заменить на `<Image src="/icon-192.png" />` (уже должна быть в manifest) или на stylized "Р" (РАЗУМ) через SVG + custom font.

### [P3] Skeleton вариации дублируют Card
**Что:** `SkeletonCard` и `SkeletonStats` определяют свои `rounded-2xl bg-surface border border-accent/10` — не через Card компонент.
**Почему:** При изменении Card (radius, border) skeleton ни за что не подхватит — визуальный рассинхрон при загрузке.
**Фикс:** Использовать `<Card>` как обёртку внутри SkeletonCard. Либо вытащить класс `card-shell` в глобальный утилити.

---

## What's working well

1. **Toast architecture — хорошая инженерия.** Context API, queue с MAX 3, aria-live, requestAnimationFrame для slide-in, корректная cleanup таймеров, портал-подобный fixed container. Best-in-class для hand-rolled решения.

2. **SwipeToDismiss с правильной физикой.** Threshold 100px, прогрессивная потеря opacity (`1 - dx / (threshold * 2.5)`), snap-back если не дотянул, `touchAction: pan-y` чтобы не блокировать скролл. Это продуманно.

3. **Цветная типизация Toast-типов (`xp`/`achievement`/`streak`/`info`/`error`).** Каждый тип — свой цвет, своя иконка, свой glow. Учит пользователя семантике: флейм = серия, звезда = ачивка. Это правильный game-feel.

4. **SSR-safety везде.** `typeof window === "undefined"` в InstallBanner, SwipeToDismiss. Не ломается в Next.js SSR.

5. **Медный `#CF9D7B` акцент** — реальная идентичность. Не generic Tailwind blue/purple. Узнаваемо.

---

## Provocative questions

1. **Почему все компоненты делают glass-эффект, если вы заявляете "маскулинную агрессию"?** Glassmorphism — женский визуальный язык. "Мужская агрессия" — это резкие линии, высокий контраст, тяжёлые формы, военные метафоры (погоны, нашивки, штрихкод). Если бы компоненты действительно были агрессивными — некоторые были бы без `rounded-2xl`, некоторые с рваным бордером, некоторые с текстурой как на износ. Сейчас это "платформа в тёмной теме", а не "платформа для мужчин".

2. **Компоненты `ui/` учат пользователя тыкать или учат не ошибаться?** Я не вижу ни одного `confirm` паттерна, ни одной кнопки с "Вы уверены?", ни одной автосохранённой формы. Button `danger` просто выполнит опасное действие, если пользователь нажмёт. Error prevention (Heuristic 5) почти не заложена в примитивах.

3. **Кого на самом деле обслуживают эти компоненты?** Если целевой пользователь — мужчина 18-35 на мобилке в метро, которому нужна быстрая выдача знаний, то Toast на 3 секунды с `duration=3000` — слишком мало для `info` и слишком много для `xp`. Должна ли длительность зависеть от типа? Важны ли `achievement` долго, а `xp` — мимолётно?

---

## Summary

Слой компонентов — это **ремесленно хорошо, системно слабо**. Каждый компонент отдельно решён разумно, но вместе они не образуют дизайн-систему: расходящиеся палитры, два стилевых диалекта, пять способов сделать border, ни одного `focus-visible`, неполные API примитивов. "AI-slop" не кричит, но явно виден в glassmorphism-повсеместности и generic-радиусах. Для MVP — жить можно. Перед публичным запуском — рефактор токенов и расширение Button/Card API обязательны.
