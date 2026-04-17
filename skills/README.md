# Skills — пояснительная записка для команды РАЗУМ

Папка содержит все 28 скиллов Claude Code, скопированные из `~/.claude/skills/`. Документация рассчитана на Никиту (Lead) и Бонди (Frontend + Дизайн).

Структура документа:
1. **Часть 1** — чёткие описания каждого скилла (что делает, зачем нужен).
2. **Часть 2** — инструкции с командами и аргументами.
3. **Часть 3** — правильная последовательность применения скиллов (готовые пайплайны).

---

# ЧАСТЬ 1. ОПИСАНИЯ СКИЛЛОВ

## Ядро

### impeccable
Главный скилл дизайн-системы. Содержит базовые принципы, anti-patterns и **Context Gathering Protocol** — протокол сбора контекста проекта (стек, тема, брейкпоинты, правила). Почти все остальные дизайн-скиллы требуют, чтобы `impeccable teach` был запущен один раз — иначе они не знают стиль проекта. Умеет создавать production-grade компоненты с нуля и извлекать дизайн-токены в систему.

## Дизайн-модификаторы (семейство Impeccable, v2.1.1)

### adapt
Адаптирует готовый дизайн под разные контексты: экраны, устройства, платформы. Внедряет брейкпоинты, fluid-лэйауты, корректные размеры тач-таргетов. Работает от конкретного компонента до целой страницы.

### animate
Анализирует фичу и добавляет осмысленные анимации, микро-интеракции, motion-эффекты. Делает не «украшательства», а движение, которое улучшает понимание состояния и даёт фидбек пользователю.

### audit
Технический аудит качества: доступность (a11y), производительность, тема, респонсив, anti-patterns. **Не чинит** — выдаёт структурированный отчёт с рейтингами severity P0–P3 и планом действий. Это code-level проверка, а не дизайн-критика.

### bolder
Усиливает «скучный» или безликий дизайн — увеличивает визуальный импакт и характер, сохраняя юзабилити. Применяется, когда интерфейс выглядит generic, безопасно, без личности.

### clarify
Улучшает UX-копирайтинг: непонятные тексты, плохие error messages, туманные лейблы и инструкции. Делает интерфейс читабельнее и легче в освоении.

### colorize
Стратегически вводит цвет в монохромный, серый или «холодный» дизайн. Не раскрашивает ради раскраски — добавляет цвет там, где он усиливает иерархию и смысл.

### critique
UX-оценка с количественным скорингом: визуальная иерархия, информационная архитектура, эмоциональный отклик, когнитивная нагрузка. Запускает 2 независимых суб-агента (чтобы избежать смещения), затем сводит выводы в отчёт с actionable-фидбеком.

### delight
Добавляет моменты радости, характер, неожиданные детали — превращает функциональный интерфейс в запоминающийся. Работает в балансе: не отвлекает, а усиливает.

### distill
Убирает лишнее, оставляет суть. Применяется, когда UI перегружен, загромождён или слишком «шумный». Девиз: «great design is simple, powerful, and clean».

### layout
Исправляет композицию, отступы, визуальный ритм и иерархию. Превращает монотонные гриды и хаотичные расстановки в интенциональные композиции.

### optimize
Диагностирует и чинит производительность UI: LCP/INP/CLS, время загрузки, FPS, размер бандла, рендер, изображения. Применяется, когда «лагает» или долго грузится.

### overdrive
Пушит интерфейс за конвенциональные пределы: шейдеры, spring-физика, scroll-driven reveal, 60fps-анимации, морфинги. Цель — сделать интерфейс «экстраординарным» (таблица на миллион строк, cinematic-переходы).

### polish
Финальный проход перед релизом: выравнивание, отступы, консистентность, микро-детали. Доводит работу от «хорошо» до «отлично». Не переделывает — шлифует.

### quieter
Приглушает визуально агрессивные, кричащие, перегруженные дизайны. Снижает интенсивность, сохраняя качество и эффективность.

### shape
**Планирует** UX и UI фичи **до написания кода**. Проводит структурированное discovery-интервью, затем выдаёт design brief, который передаётся в implementation-скиллы. Код сам не пишет.

### typeset
Улучшает типографику: выбор шрифтов, иерархия, размеры, вес, читаемость. Превращает default-текст в интенциональный.

## Стилевые пресеты

### design-taste-frontend
Senior UI/UX Engineer с параметрами-ползунками: `DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY` (значения 1–10). Обязательная проверка зависимостей в `package.json` перед импортом библиотек. Учитывает RSC-safety в Next.js.

### gpt-taste
Awwwards-level дизайн. Editorial typography (Satoshi, Cabinet Grotesk, Outfit, Geist — **не Inter**), gapless bento grids, GSAP ScrollTrigger (pinning, stacking, scrubbing). Использует псевдо-Python-рандомизацию, чтобы не повторять один и тот же лэйаут.

### high-end-visual-design
Persona «Vanguard UI Architect» — $150k+ агентский уровень. Строгие anti-pattern правила: запрещены Inter/Roboto/Arial, Lucide/Material Icons, `shadow-md`, `linear`/`ease-in-out`. Разрешены Geist, Clash Display, PP Editorial New, ультралёгкие линии (Phosphor Light, Remix Line).

### emil-design-eng
Философия Emil Kowalski (автор курса animations.dev) про детали, polish, анимацию, «invisible details that make software feel great». При первом вызове без вопроса отвечает только приветствием со ссылкой на animations.dev — это by design, не баг.

### industrial-brutalist-ui
Свисс-типографика + военно-терминальная эстетика (HUD, CRT, blueprints). Жёсткие модульные гриды, экстремальный типографический контраст, утилитарная палитра, halftones и сканлайны. **Правило:** выбрать ОДИН из двух режимов (Swiss Industrial Print / Tactical Telemetry CRT), не мешать их.

### minimalist-ui
Чистый editorial-стиль: тёплая монохромная палитра, высокий контраст, bento-grids, приглушённые пастельные акценты, «document-style» интерфейсы. **Запрещены:** Inter/Roboto, Lucide/Feather, тяжёлые тени, градиенты, emoji, `rounded-full` для больших элементов.

### stitch-design-taste
Генерирует `DESIGN.md` файлы для Google Stitch (labs.google.com/stitch). Переводит anti-slop принципы в семантический язык, понятный AI-агенту Stitch, чтобы тот генерировал экраны в премиальном стиле.

### redesign-existing-projects
Прокачивает существующий проект до премиального уровня. Не переписывает с нуля — аудитит текущий код (любой стек: Tailwind, vanilla CSS, styled-components), находит generic AI-паттерны, применяет точечные фиксы.

## Утилиты

### graphify
Превращает любую папку (код, доки, статьи, изображения) в навигируемый граф знаний с кластеризацией и community detection. На выходе — три артефакта: интерактивный HTML-граф, GraphRAG-ready JSON, `GRAPH_REPORT.md` (человеческий отчёт).

### find-skills
Помогает найти и установить новые скиллы из open-ecosystem. Применяется, когда возникает вопрос «а есть ли скилл для X?».

### full-output-enforcement
Форсирует полный вывод кода без обрезаний. Запрещает паттерны `// ...`, `// rest of code`, `// TODO`, «I can provide more if needed». Применяется, когда нужен гарантированно полный файл/компонент без пропусков.

---

# ЧАСТЬ 2. КОМАНДЫ И АРГУМЕНТЫ

Все скиллы вызываются слеш-командой в чате Claude Code: `/<имя-скилла> [аргументы]`.

## Ядро

### [impeccable](impeccable/SKILL.md)
```
/impeccable teach                    # установить контекст проекта (ОДИН РАЗ на проект)
/impeccable craft "<описание>"       # спроектировать + закодить фичу
/impeccable extract                  # извлечь переиспользуемые компоненты и токены
/impeccable                          # базовый режим (сам спросит, что делать)
```
**Аргумент:** `[craft|teach|extract]`

## Дизайн-модификаторы

Все принимают необязательный `[target]` — компонент, страница или фича. Все требуют предварительного `/impeccable teach`.

### [adapt](adapt/SKILL.md)
```
/adapt                               # адаптировать текущий контекст
/adapt "battle-screen"               # конкретная фича
/adapt "battle-screen" mobile        # явный контекст адаптации
/adapt "dashboard" tablet
/adapt "article" print
```
**Аргументы:** `[target] [context]` (context: mobile | tablet | print | ...)

### [animate](animate/SKILL.md)
```
/animate                             # анимировать текущую фичу
/animate "button"
/animate "hero section"
```
**Аргумент:** `[target]`

### [audit](audit/SKILL.md)
```
/audit                               # аудит всей области в фокусе
/audit "battle-page"                 # аудит конкретной страницы/фичи
/audit "header component"
```
**Аргумент:** `[area]`

### [bolder](bolder/SKILL.md)
```
/bolder
/bolder "landing hero"
```
**Аргумент:** `[target]`

### [clarify](clarify/SKILL.md)
```
/clarify
/clarify "error messages"
/clarify "onboarding flow"
```
**Аргумент:** `[target]`

### [colorize](colorize/SKILL.md)
```
/colorize
/colorize "dashboard cards"
```
**Аргумент:** `[target]`

### [critique](critique/SKILL.md)
```
/critique
/critique "profile page"
/critique "battle UI"
```
**Аргумент:** `[area]`

### [delight](delight/SKILL.md)
```
/delight
/delight "victory screen"
```
**Аргумент:** `[target]`

### [distill](distill/SKILL.md)
```
/distill
/distill "settings page"
```
**Аргумент:** `[target]`

### [layout](layout/SKILL.md)
```
/layout
/layout "knowledge tree"
```
**Аргумент:** `[target]`

### [optimize](optimize/SKILL.md)
```
/optimize
/optimize "battle screen"
/optimize "image loading"
```
**Аргумент:** `[target]`

### [overdrive](overdrive/SKILL.md)
```
/overdrive
/overdrive "hero section"
/overdrive "level-up transition"
```
**Аргумент:** `[target]`

### [polish](polish/SKILL.md)
```
/polish
/polish "battle results"
```
**Аргумент:** `[target]`

### [quieter](quieter/SKILL.md)
```
/quieter
/quieter "notifications panel"
```
**Аргумент:** `[target]`

### [shape](shape/SKILL.md)
```
/shape "knowledge tree page"
/shape "warmup daily flow"
```
**Аргумент:** `[feature]` — что спроектировать

### [typeset](typeset/SKILL.md)
```
/typeset
/typeset "article reader"
```
**Аргумент:** `[target]`

## Стилевые пресеты

Вызываются без аргументов — задают стилистику для всей последующей работы в сессии.

### [design-taste-frontend](design-taste-frontend/SKILL.md)
```
/design-taste-frontend
```
По умолчанию: VARIANCE=8, MOTION=6, DENSITY=4. Значения можно менять в чате: «уменьши MOTION до 3».

### [gpt-taste](gpt-taste/SKILL.md)
```
/gpt-taste
```

### [high-end-visual-design](high-end-visual-design/SKILL.md)
```
/high-end-visual-design
```

### [emil-design-eng](emil-design-eng/SKILL.md)
```
/emil-design-eng
```

### [industrial-brutalist-ui](industrial-brutalist-ui/SKILL.md)
```
/industrial-brutalist-ui
```
Обязательно указать режим: Swiss Industrial Print ИЛИ Tactical Telemetry CRT. Не мешать.

### [minimalist-ui](minimalist-ui/SKILL.md)
```
/minimalist-ui
```

### [stitch-design-taste](stitch-design-taste/SKILL.md)
```
/stitch-design-taste
```
На выходе — `DESIGN.md` файл для Google Stitch.

### [redesign-existing-projects](redesign-existing-projects/SKILL.md)
```
/redesign-existing-projects
```
Запускается на уже существующем коде — сам прочитает стек и применит улучшения.

## Утилиты

### [graphify](graphify/SKILL.md)
```
/graphify                            # граф текущей директории
/graphify <path>                     # граф указанной папки
/graphify <path> --mode deep         # глубокое извлечение связей
/graphify <path> --update            # инкрементально — только новые/изменённые файлы
/graphify <path> --directed          # направленный граф (source → target)
/graphify <path> --cluster-only      # перекластеризовать существующий граф
/graphify <path> --no-viz            # без визуализации, только JSON + отчёт
```

### [find-skills](find-skills/SKILL.md)
```
/find-skills "что нужно"
/find-skills "testing"
/find-skills "deployment automation"
```

### [full-output-enforcement](full-output-enforcement/SKILL.md)
```
/full-output-enforcement
```
Вызывать перед задачей, где нужен гарантированно полный вывод (большие файлы, N компонентов подряд).

---

# ЧАСТЬ 3. ПРАВИЛЬНЫЕ ПОСЛЕДОВАТЕЛЬНОСТИ

Скиллы дают максимум в цепочках. Ниже — готовые пайплайны для типичных задач РАЗУМ.

## Пайплайн A — Новая фича с нуля (Бонди)

Например: «экран битвы», «страница дерева знаний».

```
1. /impeccable teach
   Один раз на проект: Claude читает CLAUDE.md, стек, тему, брейкпоинты.
   После этого можно не повторять.

2. /shape "battle screen"
   Планирование UX: цели, пользователи, состояния, flow. Выдаёт design brief.
   Код не пишет — пишет спецификацию.

3. Выбрать стилевой пресет (один):
   /industrial-brutalist-ui  — для батлов, суровой RPG-эстетики
   /high-end-visual-design   — для основных страниц, профиля, настроек
   /minimalist-ui            — для читалки, docs, onboarding

4. /impeccable craft "battle screen по брифу из шага 2"
   Собственно кодинг: компоненты, стили, интеграция.

5. /animate "battle screen"
   Добавить микро-интеракции (hover, переходы состояний, feedback).

6. /critique "battle screen"
   UX-ревью от 2 независимых агентов.
   Вернуть исправления в код.

7. /polish "battle screen"
   Финальная шлифовка: выравнивание, ритм, консистентность.

8. /audit "battle screen"
   Технический финиш: a11y, perf, responsive, anti-patterns.
   Исправить всё P0 и P1.

9. /adapt "battle screen" mobile
   Проверить 375/390/414px (mobile-first из CLAUDE.md).
```

## Пайплайн B — Починка уже существующей фичи

Например: «профиль пользователя выглядит безлико».

```
1. /impeccable teach                 (если ещё не был запущен)

2. /critique "profile page"
   Найти проблемы с UX, иерархией, emotional resonance.

3. /audit "profile page"
   Найти технические проблемы (a11y, perf).

4. На основе отчётов выбрать один из модификаторов:
   /bolder   — если безлико
   /distill  — если перегружено
   /quieter  — если агрессивно
   /colorize — если серо
   /layout   — если композиция сломана
   /typeset  — если типографика generic
   /clarify  — если тексты непонятные

5. /polish "profile page"
   Финальная шлифовка.
```

## Пайплайн C — Полный редизайн проекта

```
1. /impeccable teach
2. /redesign-existing-projects
   Сам просканирует стек, найдёт generic паттерны, применит фиксы.
3. /audit + /critique                (проверка)
4. /polish                           (финал)
```

## Пайплайн D — Оптимизация performance

```
1. /audit "slow page"
   Найти конкретные проблемы с perf.

2. /optimize "slow page"
   Починить: LCP, INP, CLS, бандл, изображения.

3. /audit "slow page"
   Повторный аудит: убедиться, что метрики улучшились.
```

## Пайплайн E — Wow-эффект для ключевого экрана

Например: стартовая страница, экран победы в битве.

```
1. /impeccable teach
2. /shape "victory screen"
3. /high-end-visual-design   (или industrial-brutalist-ui для РАЗУМ)
4. /impeccable craft "victory screen"
5. /overdrive "victory screen"
   Шейдеры, spring-физика, cinematic переходы.
6. /delight "victory screen"
   Моменты радости, личность.
7. /optimize "victory screen"
   Overdrive + delight могут просадить perf → сразу оптимизировать.
8. /polish + /audit
```

## Пайплайн F — Code review (Никита)

Когда Бонди прислал PR с UI-фичей.

```
1. /audit <feature>
   Технические проблемы: a11y, perf, responsive.

2. /critique <feature>
   UX-проблемы: иерархия, когнитивная нагрузка.

3. Вернуть оба отчёта в комментарии PR.
```

## Пайплайн G — Планирование / документация

```
/graphify docs/
   Карта связей между SPRINT, WORKLOG, ARCHITECTURE, ROADMAP.
   Помогает увидеть, где документация расходится с кодом.

/graphify packages/shared/src/battle/
   Карта архитектуры батл-движка — полезно для онбординга и ревью.

/graphify apps/api/src/
   Карта NestJS-модулей (для Яшкина).
```

## Общие правила последовательности

1. **`/impeccable teach` всегда первый.** Без него остальные дизайн-скиллы не знают проект.
2. **`/shape` — до кода, `/impeccable craft` — сам код.** Не наоборот.
3. **Стилевой пресет — ОДИН на проект (или один на раздел).** Не мешать `industrial-brutalist-ui` с `minimalist-ui` на одной странице.
4. **`/critique` → правки → `/polish` → `/audit` — перед каждым PR.**
5. **`/overdrive` и `/delight` всегда сопровождать `/optimize`** — визуальный impact дорог по perf.
6. **`/adapt mobile` не забывать** — mobile-first из CLAUDE.md (375/390/414px).
7. **`/audit` не чинит — только репортит.** Дальше нужны модификаторы (`/layout`, `/optimize`, `/typeset` и т.д.) для фикса.
8. **`/full-output-enforcement` включать вручную**, если задача большая и есть риск усечения.

## Шпаргалка «какая проблема → какой скилл»

| Симптом | Скилл |
|---|---|
| «выглядит безлико, скучно» | `/bolder` |
| «слишком кричит, перегружает» | `/quieter` |
| «всё серое, холодное» | `/colorize` |
| «слишком много всего» | `/distill` |
| «не хватает жизни, статично» | `/animate` |
| «хочу вау» | `/overdrive` + `/delight` |
| «тексты непонятные» | `/clarify` |
| «шрифты generic» | `/typeset` |
| «криво расставлено» | `/layout` |
| «лагает, тормозит» | `/optimize` |
| «не работает на мобилке» | `/adapt mobile` |
| «хочу отзыв на дизайн» | `/critique` |
| «надо проверить перед релизом» | `/audit` + `/polish` |
| «надо спроектировать до кода» | `/shape` |
| «хочу карту связей в коде/доках» | `/graphify` |
| «Claude урезает вывод» | `/full-output-enforcement` |

---

## Где установлены скиллы

- **Глобально (Claude читает отсюда):** `~/.claude/skills/`
- **Копия в проекте (эта папка):** `skills/`

Если правите скилл под проект — правьте в обоих местах, чтобы не разошлись.
