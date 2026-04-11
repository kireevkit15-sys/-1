#!/usr/bin/env bash
# РАЗУМ — Database Backup Script
# Usage: ./scripts/backup.sh [--restore <file>] [--list]
#
# Examples:
#   ./scripts/backup.sh                     # Create backup + cleanup old
#   ./scripts/backup.sh --list              # List available backups
#   ./scripts/backup.sh --restore latest    # Restore from latest backup
#   ./scripts/backup.sh --restore razum_backup_20260405_120000.dump

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
DB_CONTAINER="razum-postgres"
DB_NAME="razum"
DB_USER="razum"
MAX_BACKUPS=10
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# S3 configuration (set via environment or .env)
S3_BUCKET="${RAZUM_S3_BUCKET:-}"
S3_PREFIX="${RAZUM_S3_PREFIX:-razum-backups}"
S3_REGION="${RAZUM_S3_REGION:-eu-central-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helper Functions ────────────────────────────────────────────────────────

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

ensure_backup_dir() {
    mkdir -p "$BACKUP_DIR"
}

# Check if the PostgreSQL container is running
check_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        log_error "Container '${DB_CONTAINER}' is not running."
        log_info "Start it with: docker compose up -d postgres"
        exit 1
    fi
}

# ─── S3 Upload ──────────────────────────────────────────────────────────────

upload_to_s3() {
    local file="$1"
    local filename
    filename=$(basename "$file")

    if [[ -z "$S3_BUCKET" ]]; then
        log_info "S3 upload skipped (RAZUM_S3_BUCKET not set)"
        return 0
    fi

    if ! command -v aws &> /dev/null; then
        log_warn "AWS CLI not installed — skipping S3 upload"
        log_info "Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
        return 1
    fi

    local s3_path="s3://${S3_BUCKET}/${S3_PREFIX}/${filename}"
    log_info "Uploading to ${s3_path}..."

    if aws s3 cp "$file" "$s3_path" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --only-show-errors; then
        log_ok "Uploaded to S3: ${s3_path}"
        return 0
    else
        log_error "S3 upload failed for ${filename}"
        return 1
    fi
}

cleanup_s3() {
    if [[ -z "$S3_BUCKET" ]]; then
        return 0
    fi

    if ! command -v aws &> /dev/null; then
        return 0
    fi

    log_info "Cleaning up old S3 backups (keeping last ${MAX_BACKUPS})..."

    local s3_dumps
    s3_dumps=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" \
        --region "$S3_REGION" 2>/dev/null \
        | grep '\.dump$' \
        | sort -r \
        | awk '{print $4}')

    local count=0
    while IFS= read -r key; do
        [[ -z "$key" ]] && continue
        (( count++ ))
        if (( count > MAX_BACKUPS )); then
            log_warn "  Removing S3: ${key}"
            aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${key}" \
                --region "$S3_REGION" --only-show-errors

            # Also remove matching .sql.gz
            local sql_gz_key="${key%.dump}.sql.gz"
            aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${sql_gz_key}" \
                --region "$S3_REGION" --only-show-errors 2>/dev/null || true
        fi
    done <<< "$s3_dumps"

    log_ok "S3 cleanup complete."
}

# ─── 1. backup() — Create a database backup ─────────────────────────────────

backup() {
    log_info "Starting backup of database '${DB_NAME}'..."

    ensure_backup_dir
    check_container

    local dump_file="${BACKUP_DIR}/razum_backup_${TIMESTAMP}.dump"
    local sql_file="${BACKUP_DIR}/razum_backup_${TIMESTAMP}.sql"
    local sql_gz_file="${sql_file}.gz"

    # Custom format backup (.dump) — efficient, supports pg_restore
    log_info "Creating custom-format backup (.dump)..."
    docker exec "${DB_CONTAINER}" \
        pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc --no-owner --no-acl \
        > "$dump_file"

    if [[ ! -s "$dump_file" ]]; then
        log_error "Backup file is empty. pg_dump may have failed."
        rm -f "$dump_file"
        exit 1
    fi

    local dump_size
    dump_size=$(du -h "$dump_file" | cut -f1)
    log_ok "Custom backup created: $(basename "$dump_file") (${dump_size})"

    # Plain SQL backup (.sql.gz) — human-readable, compressed
    log_info "Creating SQL backup (.sql.gz)..."
    docker exec "${DB_CONTAINER}" \
        pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl \
        > "$sql_file"

    gzip "$sql_file"

    local sql_gz_size
    sql_gz_size=$(du -h "$sql_gz_file" | cut -f1)
    log_ok "SQL backup created: $(basename "$sql_gz_file") (${sql_gz_size})"

    echo ""
    log_ok "Backup completed successfully!"
    log_info "Files saved to: ${BACKUP_DIR}/"
    echo "  - $(basename "$dump_file")    (${dump_size})"
    echo "  - $(basename "$sql_gz_file")  (${sql_gz_size})"

    # Upload to S3
    upload_to_s3 "$dump_file"
    upload_to_s3 "$sql_gz_file"
}

# ─── 2. restore(file) — Restore from a backup ───────────────────────────────

restore() {
    local input_file="$1"
    local restore_file=""

    check_container

    # Handle "latest" keyword
    if [[ "$input_file" == "latest" ]]; then
        restore_file=$(find "$BACKUP_DIR" -name "razum_backup_*.dump" -type f 2>/dev/null \
            | sort -r | head -n1)
        if [[ -z "$restore_file" ]]; then
            log_error "No .dump backup files found in ${BACKUP_DIR}/"
            exit 1
        fi
        log_info "Latest backup: $(basename "$restore_file")"
    else
        # Try as-is, then inside BACKUP_DIR
        if [[ -f "$input_file" ]]; then
            restore_file="$input_file"
        elif [[ -f "${BACKUP_DIR}/${input_file}" ]]; then
            restore_file="${BACKUP_DIR}/${input_file}"
        else
            log_error "File not found: ${input_file}"
            exit 1
        fi
    fi

    local filename
    filename=$(basename "$restore_file")
    local filesize
    filesize=$(du -h "$restore_file" | cut -f1)

    echo ""
    log_warn "=== DATABASE RESTORE ==="
    log_warn "File:     ${filename} (${filesize})"
    log_warn "Database: ${DB_NAME}"
    log_warn "This will DROP and recreate the database!"
    echo ""
    read -r -p "Are you sure you want to restore? (y/N): " confirm

    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi

    echo ""

    if [[ "$filename" == *.dump ]]; then
        # Restore from custom format (.dump)
        log_info "Restoring from custom-format backup..."

        # Drop and recreate the database
        docker exec "${DB_CONTAINER}" \
            psql -U "${DB_USER}" -d postgres \
            -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
            > /dev/null 2>&1 || true

        docker exec "${DB_CONTAINER}" \
            dropdb -U "${DB_USER}" --if-exists "${DB_NAME}"

        docker exec "${DB_CONTAINER}" \
            createdb -U "${DB_USER}" "${DB_NAME}"

        # Restore using pg_restore
        cat "$restore_file" | docker exec -i "${DB_CONTAINER}" \
            pg_restore -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-acl --single-transaction 2>&1 || true

        log_ok "Restore from .dump completed!"

    elif [[ "$filename" == *.sql.gz ]]; then
        # Restore from compressed SQL (.sql.gz)
        log_info "Restoring from compressed SQL backup..."

        # Drop and recreate the database
        docker exec "${DB_CONTAINER}" \
            psql -U "${DB_USER}" -d postgres \
            -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
            > /dev/null 2>&1 || true

        docker exec "${DB_CONTAINER}" \
            dropdb -U "${DB_USER}" --if-exists "${DB_NAME}"

        docker exec "${DB_CONTAINER}" \
            createdb -U "${DB_USER}" "${DB_NAME}"

        # Decompress and pipe to psql
        gunzip -c "$restore_file" | docker exec -i "${DB_CONTAINER}" \
            psql -U "${DB_USER}" -d "${DB_NAME}" --single-transaction > /dev/null 2>&1

        log_ok "Restore from .sql.gz completed!"

    else
        log_error "Unsupported file format: ${filename}"
        log_info "Supported formats: .dump, .sql.gz"
        exit 1
    fi

    echo ""
    log_ok "Database '${DB_NAME}' has been restored successfully!"
    log_info "You may need to run 'pnpm db:generate' to sync Prisma client."
}

# ─── 3. cleanup() — Remove old backups ──────────────────────────────────────

cleanup() {
    ensure_backup_dir

    local dump_files
    dump_files=$(find "$BACKUP_DIR" -name "razum_backup_*.dump" -type f 2>/dev/null | sort -r)
    local dump_count
    dump_count=$(echo "$dump_files" | grep -c '.' 2>/dev/null || echo 0)

    if (( dump_count <= MAX_BACKUPS )); then
        log_info "Cleanup: ${dump_count}/${MAX_BACKUPS} backups — nothing to remove."
        return
    fi

    local to_delete
    to_delete=$(echo "$dump_files" | tail -n +$(( MAX_BACKUPS + 1 )))
    local deleted=0

    echo ""
    log_info "Cleaning up old backups (keeping last ${MAX_BACKUPS})..."

    while IFS= read -r dump; do
        [[ -z "$dump" ]] && continue
        local base
        base=$(basename "$dump" .dump)
        local sql_gz="${BACKUP_DIR}/${base}.sql.gz"

        log_warn "  Removing: $(basename "$dump")"
        rm -f "$dump"

        if [[ -f "$sql_gz" ]]; then
            log_warn "  Removing: $(basename "$sql_gz")"
            rm -f "$sql_gz"
        fi

        (( deleted++ ))
    done <<< "$to_delete"

    log_ok "Cleanup complete: removed ${deleted} old backup(s)."
}

# ─── 4. list() — Show available backups ─────────────────────────────────────

list_backups() {
    ensure_backup_dir

    local files
    files=$(find "$BACKUP_DIR" -name "razum_backup_*" -type f 2>/dev/null | sort -r)

    if [[ -z "$files" ]]; then
        log_info "No backups found in ${BACKUP_DIR}/"
        return
    fi

    echo ""
    echo -e "${BLUE}Available backups:${NC}"
    echo "─────────────────────────────────────────────────────────"
    printf "%-45s %8s  %s\n" "FILENAME" "SIZE" "DATE"
    echo "─────────────────────────────────────────────────────────"

    while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        local name size mod_date
        name=$(basename "$f")
        size=$(du -h "$f" | cut -f1)
        mod_date=$(date -r "$f" "+%Y-%m-%d %H:%M" 2>/dev/null || stat -c '%y' "$f" 2>/dev/null | cut -d'.' -f1)
        printf "%-45s %8s  %s\n" "$name" "$size" "$mod_date"
    done <<< "$files"

    echo "─────────────────────────────────────────────────────────"

    local total_count total_size
    total_count=$(echo "$files" | wc -l | tr -d ' ')
    total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo -e "Total: ${total_count} file(s), ${total_size} on disk"
    echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   РАЗУМ — Database Backup Utility    ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
    echo ""

    case "${1:-}" in
        --restore)
            if [[ -z "${2:-}" ]]; then
                log_error "Usage: $0 --restore <file|latest>"
                exit 1
            fi
            restore "$2"
            ;;
        --list)
            list_backups
            ;;
        --help|-h)
            echo "Usage: $0 [OPTION]"
            echo ""
            echo "Options:"
            echo "  (no args)          Create backup, upload to S3, cleanup old"
            echo "  --restore <file>   Restore from a backup file"
            echo "  --restore latest   Restore from the latest backup"
            echo "  --list             List available local backups"
            echo "  --s3-list          List backups in S3"
            echo "  --help             Show this help message"
            echo ""
            echo "Configuration:"
            echo "  Container:    ${DB_CONTAINER}"
            echo "  Database:     ${DB_NAME}"
            echo "  Backup dir:   ${BACKUP_DIR}"
            echo "  Max backups:  ${MAX_BACKUPS}"
            echo "  S3 bucket:    ${S3_BUCKET:-<not set>}"
            echo "  S3 prefix:    ${S3_PREFIX}"
            echo "  S3 region:    ${S3_REGION}"
            echo ""
            echo "Environment variables:"
            echo "  RAZUM_S3_BUCKET    S3 bucket name (required for S3 upload)"
            echo "  RAZUM_S3_PREFIX    S3 key prefix (default: razum-backups)"
            echo "  RAZUM_S3_REGION    AWS region (default: eu-central-1)"
            echo ""
            ;;
        --s3-list)
            if [[ -z "$S3_BUCKET" ]]; then
                log_error "RAZUM_S3_BUCKET is not set"
                exit 1
            fi
            echo ""
            log_info "S3 backups in s3://${S3_BUCKET}/${S3_PREFIX}/:"
            echo "─────────────────────────────────────────────────────────"
            aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --region "$S3_REGION" --human-readable
            echo "─────────────────────────────────────────────────────────"
            ;;
        "")
            backup
            cleanup
            cleanup_s3
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Run '$0 --help' for usage."
            exit 1
            ;;
    esac
}

main "$@"
