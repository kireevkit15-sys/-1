#!/usr/bin/env bash
# Первичная выдача Let's Encrypt сертификата для РАЗУМ.
#
# Запускать ОДИН раз на свежем VPS, после `docker compose -f docker-compose.prod.yml up -d nginx`.
# Дальше certbot-контейнер сам продлевает каждые 12 часов.
#
# Env:
#   APP_DOMAIN — razum.app (основной домен)
#   EXTRA_DOMAINS — "www.razum.app" (через пробел, опционально)
#   LE_EMAIL — ops@razum.app
#   STAGING=1 — использовать Let's Encrypt staging (не тратит rate-limit)

set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN required (e.g. razum.app)}"
LE_EMAIL="${LE_EMAIL:?LE_EMAIL required (e.g. ops@razum.app)}"
EXTRA_DOMAINS="${EXTRA_DOMAINS:-www.${APP_DOMAIN}}"
STAGING="${STAGING:-0}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml}"

log()  { printf '\033[36m[le]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m %s\n' "$*" >&2; }

# Подставляем все домены в -d флаги
DOMAIN_ARGS=( -d "$APP_DOMAIN" )
for d in $EXTRA_DOMAINS; do
  DOMAIN_ARGS+=( -d "$d" )
done

# Параметры certbot
CERTBOT_ARGS=(
  certonly --webroot -w /var/www/certbot
  --email "$LE_EMAIL"
  --agree-tos --no-eff-email
  --non-interactive
  --rsa-key-size 4096
  "${DOMAIN_ARGS[@]}"
)
if [[ "$STAGING" == "1" ]]; then
  warn "STAGING=1 — выдадим тестовый сертификат (не будет доверенным в браузерах)"
  CERTBOT_ARGS+=( --staging )
fi

log "Проверяю, что nginx уже поднят и отдаёт ACME challenge..."
if ! curl -sS --fail "http://${APP_DOMAIN}/.well-known/acme-challenge/ping" -o /dev/null \
     --max-time 5 2>/dev/null; then
  warn "ACME endpoint не отвечает — но это нормально если challenge ещё не выкладывался"
fi

log "Запрос сертификата для: ${APP_DOMAIN} ${EXTRA_DOMAINS}"
$COMPOSE run --rm --entrypoint "certbot" certbot "${CERTBOT_ARGS[@]}"

log "Перезагрузка nginx для подхвата сертификата"
$COMPOSE exec nginx nginx -s reload

log ""
log "Готово. Проверь:"
log "  curl -vI https://${APP_DOMAIN}"
log "  https://www.ssllabs.com/ssltest/analyze.html?d=${APP_DOMAIN}"
log ""
log "Продление: certbot-контейнер делает renew каждые 12h автоматически (см. docker-compose.prod.yml)."
