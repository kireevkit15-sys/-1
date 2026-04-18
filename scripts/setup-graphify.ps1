# setup-graphify.ps1
# One-shot setup for the graphify knowledge-graph pipeline on Windows.
# Run from the project root: powershell -ExecutionPolicy Bypass -File scripts/setup-graphify.ps1

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "[graphify-setup] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[graphify-setup] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[graphify-setup] $msg" -ForegroundColor Yellow }

# 0. Must be in a git repo root (there should be a .git directory)
if (-not (Test-Path ".git")) {
    Write-Host "Run this from the project root (where .git lives)." -ForegroundColor Red
    exit 1
}

# 1. Detect Python
Write-Step "Detecting Python..."
$python = $null
foreach ($candidate in @("python", "python3", "py")) {
    try {
        $v = & $candidate --version 2>&1
        if ($LASTEXITCODE -eq 0) { $python = $candidate; break }
    } catch {}
}
if (-not $python) {
    Write-Host "Python not found. Install Python 3.10+ from python.org and re-run." -ForegroundColor Red
    exit 1
}
Write-Ok "Python: $python"

# 2. Install/upgrade graphifyy
Write-Step "Installing graphifyy (pip)..."
& $python -m pip install --upgrade graphifyy --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Warn "pip install failed, retrying without --quiet..."
    & $python -m pip install --upgrade graphifyy
    if ($LASTEXITCODE -ne 0) { Write-Host "Install failed." -ForegroundColor Red; exit 1 }
}
Write-Ok "graphifyy installed."

# 3. Install the base graphify post-commit hook (wrote by graphify CLI)
Write-Step "Installing base graphify hook..."
& $python -m graphify hook install 2>&1 | Out-Null

# 4. Overwrite .git/hooks/post-commit with our extended version (auto-amend for all 5 graphs)
$src = "scripts/graphify-post-commit.sh"
$dst = ".git/hooks/post-commit"
if (-not (Test-Path $src)) {
    Write-Host "Missing $src (did you git pull?)." -ForegroundColor Red
    exit 1
}
Write-Step "Installing extended post-commit hook (auto-amend)..."
Copy-Item -Path $src -Destination $dst -Force
# On Windows the executable bit doesn't matter for Git Bash, but keep LF line endings.
Write-Ok "Hook installed at $dst"

# 5. Install graphify skill into Claude Code
Write-Step "Installing graphify Claude skill..."
& $python -m graphify claude install 2>&1 | Out-Null
Write-Ok "Claude skill installed."

# 6. Smoke test: try a small rebuild to confirm the hook pipeline works
Write-Step "Smoke test: rebuilding code graph..."
& $python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))" 2>&1 | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Smoke test failed, but setup completed. Try a commit to verify."
} else {
    Write-Ok "Smoke test passed."
}

Write-Host ""
Write-Ok "Done. Your next commit will auto-rebuild and amend graphify-out/."
Write-Host "Docs: docs/GRAPHIFY_SETUP.md"
