#!/usr/bin/env bash
# РАЗУМ — Cron wrapper for database backup
#
# Usage in crontab (daily at 3:00 AM):
#   0 3 * * * /path/to/scripts/backup-cron.sh
#
# Usage in crontab (every 6 hours):
#   0 */6 * * * /path/to/scripts/backup-cron.sh
#
# Install cron job:
#   (crontab -l 2>/dev/null; echo "0 3 * * * $(pwd)/scripts/backup-cron.sh") | crontab -

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${PROJECT_DIR}/backups/logs"
LOG_FILE="${LOG_DIR}/backup_$(date +%Y%m%d_%H%M%S).log"
MAX_LOG_FILES=30

# ─── Setup ───────────────────────────────────────────────────────────────────

mkdir -p "$LOG_DIR"

# ─── Run backup with full logging ────────────────────────────────────────────

{
    echo "============================================"
    echo "РАЗУМ Backup — $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================"
    echo ""

    # Run the main backup script
    bash "${SCRIPT_DIR}/backup.sh"

    echo ""
    echo "============================================"
    echo "Backup finished — $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Exit code: 0"
    echo "============================================"

} >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

# ─── Cleanup old logs ────────────────────────────────────────────────────────

LOG_COUNT=$(find "$LOG_DIR" -name "backup_*.log" -type f 2>/dev/null | wc -l | tr -d ' ')

if (( LOG_COUNT > MAX_LOG_FILES )); then
    find "$LOG_DIR" -name "backup_*.log" -type f \
        | sort | head -n $(( LOG_COUNT - MAX_LOG_FILES )) \
        | xargs rm -f
fi

# ─── Exit ────────────────────────────────────────────────────────────────────

if [[ $EXIT_CODE -ne 0 ]]; then
    echo "[RAZUM BACKUP FAILED] $(date '+%Y-%m-%d %H:%M:%S') — see ${LOG_FILE}" >&2
fi

exit $EXIT_CODE
