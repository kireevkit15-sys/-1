#!/usr/bin/env bash
# setup-graphify.sh
# One-shot setup for the graphify knowledge-graph pipeline on Mac/Linux/Git Bash.
# Run from the project root: bash scripts/setup-graphify.sh
set -eu

step() { printf '\033[36m[graphify-setup]\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m[graphify-setup]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[graphify-setup]\033[0m %s\n' "$*"; }
die()  { printf '\033[31m[graphify-setup]\033[0m %s\n' "$*" >&2; exit 1; }

# 0. Must be at the git root
[ -d ".git" ] || die "Run this from the project root (where .git lives)."

# 1. Detect Python
step "Detecting Python..."
PYTHON=""
for cand in python3 python py; do
    if command -v "$cand" >/dev/null 2>&1; then PYTHON="$cand"; break; fi
done
[ -n "$PYTHON" ] || die "Python not found. Install Python 3.10+ and re-run."
ok "Python: $PYTHON ($($PYTHON --version 2>&1))"

# 2. Install/upgrade graphifyy
step "Installing graphifyy (pip)..."
"$PYTHON" -m pip install --upgrade graphifyy --quiet \
  || "$PYTHON" -m pip install --upgrade graphifyy \
  || die "pip install failed."
ok "graphifyy installed."

# 3. Install the base graphify post-commit hook
step "Installing base graphify hook..."
"$PYTHON" -m graphify hook install >/dev/null 2>&1 || warn "graphify hook install returned non-zero (will overwrite anyway)."

# 4. Overwrite .git/hooks/post-commit with our extended version (auto-amend)
SRC="scripts/graphify-post-commit.sh"
DST=".git/hooks/post-commit"
[ -f "$SRC" ] || die "Missing $SRC (did you git pull?)."
step "Installing extended post-commit hook (auto-amend)..."
cp "$SRC" "$DST"
chmod +x "$DST"
ok "Hook installed at $DST"

# 5. Install graphify skill into Claude Code
step "Installing graphify Claude skill..."
"$PYTHON" -m graphify claude install >/dev/null 2>&1 || warn "graphify claude install returned non-zero."
ok "Claude skill installed."

# 6. Smoke test
step "Smoke test: rebuilding code graph..."
if "$PYTHON" -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"; then
    ok "Smoke test passed."
else
    warn "Smoke test failed, but setup completed. Try a commit to verify."
fi

echo
ok "Done. Your next commit will auto-rebuild and amend graphify-out/."
echo "Docs: docs/GRAPHIFY_SETUP.md"
