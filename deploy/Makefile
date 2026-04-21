# РАЗУМ — prod ops Makefile.
# Запускать с VPS из /srv/razum/app (не с ноута).
#
#   make help            # весь список
#   make deploy          # безопасный передеплой (pull + migrate + up -d)
#   make logs SERVICE=api
#   make backup-now

COMPOSE := docker compose -f docker-compose.prod.yml
SERVICE ?= api

.PHONY: help
help:
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/{printf "  \033[36m%-22s\033[0m %s\n",$$1,$$2}' $(MAKEFILE_LIST)

# ---------------------------------------------------------------------------
# lifecycle
# ---------------------------------------------------------------------------

.PHONY: pull
pull: ## Подтянуть свежие образы api/web из GHCR
	$(COMPOSE) pull api web

.PHONY: up
up: ## Поднять все сервисы (без пересборки)
	$(COMPOSE) up -d --remove-orphans

.PHONY: down
down: ## Остановить все сервисы (оставить volumes)
	$(COMPOSE) down

.PHONY: restart
restart: ## Рестарт одного сервиса: make restart SERVICE=api
	$(COMPOSE) restart $(SERVICE)

.PHONY: deploy
deploy: ## Полный prod-деплой: pull + migrate + up + smoke
	@echo "==> pulling images"
	$(COMPOSE) pull api web
	@echo "==> running db migrations"
	$(COMPOSE) run --rm api pnpm --filter @razum/api prisma migrate deploy
	@echo "==> restarting services"
	$(COMPOSE) up -d --remove-orphans
	@echo "==> waiting 10s for healthchecks"
	@sleep 10
	@$(MAKE) smoke

.PHONY: smoke
smoke: ## Проверить /api/health и /
	@set -e; \
	for u in https://razum.app/api/health https://razum.app/ ; do \
	  code=$$(curl -sS -o /dev/null -w '%{http_code}' $$u); \
	  echo "  $$u → $$code"; \
	  [ "$$code" = "200" ] || { echo "FAIL $$u"; exit 1; }; \
	done

# ---------------------------------------------------------------------------
# observability
# ---------------------------------------------------------------------------

.PHONY: logs
logs: ## Логи сервиса: make logs SERVICE=api
	$(COMPOSE) logs -f --tail=200 $(SERVICE)

.PHONY: ps
ps: ## Статус контейнеров
	$(COMPOSE) ps

.PHONY: top
top: ## CPU/mem по контейнерам
	docker stats --no-stream $$($(COMPOSE) ps -q)

.PHONY: shell
shell: ## Shell внутри сервиса: make shell SERVICE=api
	$(COMPOSE) exec $(SERVICE) sh

# ---------------------------------------------------------------------------
# database
# ---------------------------------------------------------------------------

.PHONY: migrate
migrate: ## prisma migrate deploy
	$(COMPOSE) run --rm api pnpm --filter @razum/api prisma migrate deploy

.PHONY: db-shell
db-shell: ## psql внутри postgres
	$(COMPOSE) exec postgres psql -U $${DB_USER:-razum} -d $${DB_NAME:-razum}

.PHONY: backup-now
backup-now: ## Разовый дамп БД (вне крона)
	$(COMPOSE) exec backup /usr/local/bin/backup.sh backup

.PHONY: backup-list
backup-list: ## Список бэкапов в S3
	$(COMPOSE) exec backup /usr/local/bin/backup.sh s3-list

# ---------------------------------------------------------------------------
# TLS
# ---------------------------------------------------------------------------

.PHONY: le-init
le-init: ## Первичная выдача Let's Encrypt (однократно)
	bash deploy/init-letsencrypt.sh

.PHONY: le-renew
le-renew: ## Форс-обновление сертификата (обычно делает cron в certbot)
	$(COMPOSE) run --rm --entrypoint "certbot renew --webroot -w /var/www/certbot" certbot
	$(COMPOSE) exec nginx nginx -s reload

# ---------------------------------------------------------------------------
# maintenance
# ---------------------------------------------------------------------------

.PHONY: prune
prune: ## Удалить образы старше 7 дней
	docker image prune -af --filter "until=168h"

.PHONY: rollback
rollback: ## Откат к предыдущему RELEASE_TAG: make rollback TAG=v1.2.0
	@[ -n "$(TAG)" ] || { echo "Usage: make rollback TAG=<release_tag>"; exit 1; }
	RELEASE_TAG=$(TAG) $(COMPOSE) pull api web
	RELEASE_TAG=$(TAG) $(COMPOSE) up -d
	@$(MAKE) smoke
