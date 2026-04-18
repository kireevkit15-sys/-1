#!/bin/sh
# graphify-hook-start
# Auto-rebuilds the knowledge graph after each commit (code files only, no LLM needed).
# Installs code-graph rebuild + auto-amend into the same commit.
#
# To install: run scripts/setup-graphify.ps1 (Windows) or scripts/setup-graphify.sh (Mac/Linux).
# Do NOT run `graphify hook install` alone — it gives you only the base rebuild
# without the auto-amend block below.

# Guard: if we are in the middle of our own amend, exit immediately
# to prevent infinite recursion
if [ -n "$GRAPHIFY_AMENDING" ]; then
    exit 0
fi

CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD 2>/dev/null)
if [ -z "$CHANGED" ]; then
    exit 0
fi

# Detect the correct Python interpreter (handles pipx, venv, system installs)
GRAPHIFY_BIN=$(command -v graphify 2>/dev/null)
if [ -n "$GRAPHIFY_BIN" ]; then
    _SHEBANG=$(head -1 "$GRAPHIFY_BIN" | sed 's/^#![[:space:]]*//')
    case "$_SHEBANG" in
        */env\ *) GRAPHIFY_PYTHON="${_SHEBANG#*/env }" ;;
        *)         GRAPHIFY_PYTHON="$_SHEBANG" ;;
    esac
    case "$GRAPHIFY_PYTHON" in
        *[!a-zA-Z0-9/_.-]*) GRAPHIFY_PYTHON="" ;;
    esac
    if [ -n "$GRAPHIFY_PYTHON" ] && ! "$GRAPHIFY_PYTHON" -c "import graphify" 2>/dev/null; then
        GRAPHIFY_PYTHON=""
    fi
fi
if [ -z "$GRAPHIFY_PYTHON" ]; then
    if command -v python3 >/dev/null 2>&1 && python3 -c "import graphify" 2>/dev/null; then
        GRAPHIFY_PYTHON="python3"
    elif command -v python >/dev/null 2>&1 && python -c "import graphify" 2>/dev/null; then
        GRAPHIFY_PYTHON="python"
    else
        exit 0
    fi
fi

export GRAPHIFY_CHANGED="$CHANGED"
$GRAPHIFY_PYTHON -c "
import os, sys
from pathlib import Path

changed_raw = os.environ.get('GRAPHIFY_CHANGED', '')
changed = [Path(f.strip()) for f in changed_raw.strip().splitlines() if f.strip()]

if not changed:
    sys.exit(0)

print(f'[graphify hook] {len(changed)} file(s) changed - rebuilding graph...')

try:
    from graphify.watch import _rebuild_code
    _rebuild_code(Path('.'))
except Exception as exc:
    print(f'[graphify hook] Rebuild failed: {exc}')
    sys.exit(1)
"

# --- graphify auto-commit extension ---
# After rebuild, amend updated graph files (tracked or new) into this commit.
CHANGED_GRAPHS=""
for dir in graphify-out graphify-out-shared graphify-out-components graphify-out-docs graphify-materials; do
    for file in "$dir/graph.json" "$dir/GRAPH_REPORT.md"; do
        if [ -f "$file" ]; then
            if ! git diff --quiet HEAD -- "$file" 2>/dev/null; then
                CHANGED_GRAPHS="$CHANGED_GRAPHS $file"
            elif ! git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
                CHANGED_GRAPHS="$CHANGED_GRAPHS $file"
            fi
        fi
    done
done

if [ -n "$CHANGED_GRAPHS" ]; then
    echo "[graphify hook] amending commit with updated graphs:$CHANGED_GRAPHS"
    git add $CHANGED_GRAPHS
    GRAPHIFY_AMENDING=1 git commit --amend --no-edit --no-verify >/dev/null 2>&1
fi
# graphify-hook-end
