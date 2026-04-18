# graphify — установка для команды

Графы знаний помогают Claude быстро ориентироваться в проекте без чтения всех файлов. В репозитории 5 графов (код, shared, components, docs, materials). Они автоматически обновляются при каждом коммите.

## Для кого

Все разработчики команды: Никита, Бонди, Яшкин. Установка — один раз на машину.

## Быстрая установка

**Самый простой способ:** скажи в Claude Code фразу **«скачай графы»** (или «установи графы» / «настрой graphify»). Claude сам определит твою ОС и запустит правильный скрипт.

### Ручная установка

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-graphify.ps1
```

**Mac / Linux / Git Bash на Windows:**
```bash
bash scripts/setup-graphify.sh
```

Скрипт сделает:
1. Поставит `graphifyy` через `pip` (если нет).
2. Установит базовый post-commit hook через `graphify hook install`.
3. Заменит его расширенной версией из `scripts/graphify-post-commit.sh` (она умеет авто-`--amend`).
4. Установит graphify skill в Claude Code (`graphify claude install`).
5. Сделает пробный rebuild, чтобы убедиться что pipeline работает.

## Требования

- Python 3.10+ в `PATH`
- Git
- Claude Code CLI

## Как это работает

После установки:
- Каждый `git commit` → автоматический AST-rebuild `graphify-out/` → `--amend` в тот же коммит.
- При `git pull --rebase` если пришли коммиты коллег, hook отработает и обновит граф локально.
- Временные файлы (`.graphify_chunk_*.json`, `.graphify_*.json`) игнорируются через `.gitignore`.

Защита от бесконечной рекурсии: hook проверяет `GRAPHIFY_AMENDING` env var и выходит, если уже выполняется amend.

## Когда делать ручной `--update`

AST-граф (`graphify-out/`) обновляется сам. Остальные 4 графа **семантические** (строятся через LLM-subagents) и обновляются вручную:

| Граф | Когда запускать `--update` |
|---|---|
| `graphify-out-shared/` | После изменений в `packages/shared/` (battle-logic, learning, state machines) |
| `graphify-out-components/` | После больших изменений в `apps/web/components/` |
| `graphify-out-docs/` | Раз в неделю или после больших апдейтов документации |
| `graphify-materials/` | Только когда добавил новые PDF в `content/sources/` |

Команды для ручного обновления (из корня репо в Claude Code):
```
/graphify packages/shared/ --update
/graphify apps/web/components/ --update
/graphify docs/ --update
/graphify content/sources/ --update
```

`--update` работает инкрементально — пересчитывает только изменённые файлы, так что стоит дёшево.

## Проверка что всё работает

```bash
git log -1 --stat | grep graphify-out
```
Если в последнем коммите видны изменения `graphify-out/graph.json` или `GRAPHIFY_REPORT.md` — hook отработал.

## Проблемы

**`ModuleNotFoundError: No module named 'graphify'`**
→ Перезапусти терминал или проверь `pip show graphifyy`.

**Hook не срабатывает при коммите**
→ Проверь права: `ls -la .git/hooks/post-commit` должен быть исполняемым (`chmod +x` на Mac/Linux).

**Unicode errors на Windows**
→ Установи `PYTHONIOENCODING=utf-8` в профиле PowerShell.

**Конфликт при `git pull`**
→ Обычно из-за параллельных правок в `graphify-out/graph.json`. Разрешить: `git checkout --theirs graphify-out/ && git add graphify-out/ && git rebase --continue` — твой граф перестроится на следующем коммите.
