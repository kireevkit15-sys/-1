# Ротация секретов — РАЗУМ

Регламент обновления production-секретов. Придерживаемся квартальной ротации + немедленной при инциденте.

## Инвентаризация

| Секрет | Где хранится | Где используется | Периодичность |
|---|---|---|---|
| `DB_PASSWORD` | `.env.production` на VPS, GitHub Secrets (`DB_PASSWORD`) | postgres + api | 90 дней |
| `REDIS_PASSWORD` | `.env.production`, GitHub Secrets | redis + api | 90 дней |
| `JWT_SECRET` | `.env.production`, GitHub Secrets | api (подпись JWT) | 180 дней |
| `COOKIE_SECRET` | `.env.production`, GitHub Secrets | web (cookie-signing) | 180 дней |
| `TELEGRAM_BOT_TOKEN` | `.env.production` | api (telegraf) | при компрометации |
| `TELEGRAM_WEBHOOK_SECRET` | `.env.production` | api (webhook verify) | 180 дней |
| `ANTHROPIC_API_KEY` | `.env.production`, GitHub Secrets | api (AI) | при компрометации |
| `SENTRY_DSN_API` / `SENTRY_DSN_WEB` | `.env.production`, GitHub Secrets | api + web | не ротируется (DSN публичный токен) |
| `SENTRY_AUTH_TOKEN` | GitHub Secrets | CI (source map upload) | 90 дней |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `.env.production`, GitHub Secrets | backup-контейнер (S3) | 90 дней |
| `LE_EMAIL` | `.env.production` | certbot | — |
| `SSH deploy key` | `~/.ssh` на CI (GitHub Actions) | deploy.yml | 180 дней |

## Общий порядок

1. Анонс: в teamchat за 24 часа, что будет ротация (короткий downtime 30–60 с на контейнер api/web).
2. Создание нового значения — **всегда** через `openssl rand -base64 N`, никакой энтропии "из головы".
3. Обновление `.env.production` на VPS.
4. Синхронизация с GitHub Secrets (для будущих деплоев).
5. `docker compose -f docker-compose.prod.yml up -d` — пересоздать только затронутые сервисы.
6. Инвалидация старых сессий при необходимости.
7. Запись в [CHANGELOG_SECRETS.md](CHANGELOG_SECRETS.md): дата, кто ротировал, какие ключи (без значений).

## Процедуры

### JWT_SECRET

JWT подписан этим секретом — ротация инвалидирует ВСЕ существующие токены. Юзеры будут разлогинены.

```bash
# На VPS
NEW=$(openssl rand -base64 48)
sudo -u razum sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW}|" /srv/razum/app/.env.production
cd /srv/razum/app
docker compose -f docker-compose.prod.yml up -d api
```

Обнови секрет в GitHub → Settings → Secrets and variables → Actions → `JWT_SECRET`.

Альтернатива без инвалидации (zero-downtime):
- В api поддержать `JWT_SECRET` + `JWT_SECRET_PREVIOUS`, при verify пробовать оба.
- Через 8 дней (TTL токена + 1) убрать `JWT_SECRET_PREVIOUS`.

### DB_PASSWORD

```bash
# На VPS — меняем пароль в postgres И в .env одновременно
NEW=$(openssl rand -base64 32)

docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U razum -d razum -c "ALTER USER razum WITH PASSWORD '${NEW}';"

sudo -u razum bash -c "
  sed -i 's|^DB_PASSWORD=.*|DB_PASSWORD=${NEW}|' /srv/razum/app/.env.production
  sed -i \"s|postgresql://razum:[^@]*@|postgresql://razum:${NEW}@|g\" /srv/razum/app/.env.production
"

docker compose -f docker-compose.prod.yml up -d api backup
```

Обнови GitHub Secret `DB_PASSWORD`.

### REDIS_PASSWORD

```bash
NEW=$(openssl rand -base64 32)
sudo -u razum sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${NEW}|" /srv/razum/app/.env.production
docker compose -f docker-compose.prod.yml up -d redis api
```

Redis теряет сессии/очереди при рестарте, если не настроено AOF (у нас настроено) — проверь, что данные не потеряны.

### ANTHROPIC_API_KEY

1. Anthropic console → Settings → API Keys → создать новый, пометить `razum-prod-YYYY-MM-DD`.
2. Обновить `.env.production` и `docker compose up -d api`.
3. Проверить работу (/api/ai/ping).
4. Удалить старый ключ в Anthropic console.

### TELEGRAM_BOT_TOKEN

**Только при компрометации** — ротация в @BotFather отзовёт webhook, понадобится передеплой и перерегистрация webhook.

```bash
# @BotFather → /revoke → скопируй новый токен
sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=...|" /srv/razum/app/.env.production
docker compose -f docker-compose.prod.yml up -d api
curl -X POST "https://api.telegram.org/bot<NEW>/setWebhook" \
  -d "url=https://razum.app/api/telegram/webhook&secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

### AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY

1. IAM → Users → `razum-backup` → Security credentials → Create access key.
2. Обновить `.env.production` и GitHub Secrets.
3. `docker compose up -d backup` → дождаться следующего бэкапа, проверить S3.
4. Deactivate старый ключ, через 7 дней — Delete.

### SSH deploy key

1. Сгенерить новую пару на CI (GitHub Actions):
   ```bash
   ssh-keygen -t ed25519 -C "razum-deploy-YYYY-MM" -f razum_deploy -N ""
   ```
2. Публичный ключ добавить в `/home/razum/.ssh/authorized_keys` на VPS.
3. Приватный положить в GitHub Secret `DEPLOY_SSH_KEY`.
4. После успешного run deploy.yml — удалить старый публичный ключ из `authorized_keys`.

## Инцидент-флоу (компрометация)

При утечке (коммит с секретом в публичный репо, утерянный лаптоп, поддельный PR и т.д.):

1. **Немедленно** — revoke на стороне провайдера (Anthropic, AWS, Telegram).
2. В течение 15 минут — ротация по процедурам выше.
3. Проверить access-логи (S3 CloudTrail, Anthropic usage, pg_stat_activity).
4. Если есть следы несанкционированного доступа — отключить api (maintenance mode), провести аудит, только потом вернуть.
5. Постмортем в `docs/INCIDENTS/YYYY-MM-DD-<topic>.md` в течение 72 часов.
6. Если утёк в git — `git filter-repo` + форс-пуш + ротация **всех** секретов (предполагаем, что другие тоже могли утечь).

## Календарь ротаций

Напоминание в календаре Никиты (Lead) с повторением:

| Дата | Что ротируем |
|---|---|
| 1-е число каждого месяца | аудит: `docker compose exec api env \| grep SECRET` — проверка, что всё из `.env.production`, не хардкод |
| 1 июля 2026 | `DB_PASSWORD`, `REDIS_PASSWORD`, `AWS_*`, `SENTRY_AUTH_TOKEN` |
| 1 октября 2026 | `JWT_SECRET`, `COOKIE_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, SSH deploy key |

Все ротации логируются в [CHANGELOG_SECRETS.md](CHANGELOG_SECRETS.md) (создаётся в момент первой ротации).
