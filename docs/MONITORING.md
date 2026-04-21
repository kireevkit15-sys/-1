# Monitoring — РАЗУМ

Что мониторим, чем, и как реагируем.

## Стек

| Слой | Инструмент | Где смотреть | Кто получает алерт |
|---|---|---|---|
| HTTP uptime | UptimeRobot (free) | uptimerobot.com | PagerDuty → Telegram @razum_ops |
| Ошибки приложения | Sentry | sentry.io/razum/{api,web} | Telegram @razum_ops |
| Метрики хоста | `docker stats`, `htop` via SSH | — | ручной аудит раз в неделю |
| Логи | `docker compose logs`, json_combined в nginx | — | Sentry цепляет 5xx |
| Бэкапы | S3 + логи `backup` контейнера | `make backup-list` | дневной дайджест в Telegram |

Grafana + Prometheus — опционально (D5.3), добавим при росте нагрузки.

## UptimeRobot чеки

Создать 4 монитора, интервал 5 минут, keyword-проверки:

1. **razum-frontend**: `GET https://razum.app/` → HTTP 200 + keyword `РАЗУМ`
2. **razum-api-health**: `GET https://razum.app/api/health` → HTTP 200 + keyword `"status":"ok"`
3. **razum-api-ready**: `GET https://razum.app/api/ready` → HTTP 200 (проверяет БД+Redis)
4. **razum-websocket**: `GET https://razum.app/socket.io/?EIO=4&transport=polling` → HTTP 200

Оповещения:
- Email → `ops@razum.app`
- Webhook → Telegram-бот `@razum_ops_bot` (отдельный от юзер-бота)

SLA цель: 99.5% (≤3.6h downtime/месяц).

## Sentry alert rules

В Sentry → Alerts → Create Alert:

| Имя | Условие | Канал |
|---|---|---|
| `api-error-spike` | >10 events/min в проекте `razum-api` за последние 5 мин | Telegram |
| `api-new-issue` | Любой новый `issue.first_seen` в `razum-api` | Telegram |
| `web-error-spike` | >30 events/min в `razum-web` за 5 мин (учитывая бот-трафик) | Telegram |
| `performance-degradation` | p95 транзакции `POST /v1/battles/join` >2s за 10 мин | Telegram |
| `ai-budget-breach` | 5xx от `/v1/ai/*` >3/min (может означать исчерпание бюджета Anthropic) | Telegram + email Никите |

## Backup проверка

Раз в день в 09:00 UTC cron на VPS отправляет в Telegram:
- последний успешный бэкап (timestamp, размер)
- размер S3-бакета
- пятна — если последний бэкап старше 30 часов → алерт

Скрипт: `scripts/backup-digest.sh` (написать в D5.2).

Раз в неделю — **проверка восстановления**:
```bash
make backup-list
scripts/backup.sh restore --latest --target /tmp/restore-check.sql
```
Цель: убедиться, что бэкапы не битые. Записать дату проверки в `docs/INCIDENTS/backup-tests.md`.

## Incident response

1. Алерт в Telegram → дежурный (Никита).
2. Подтверждение: зашёл на VPS, посмотрел `make ps`, `make logs SERVICE=...`.
3. Определение severity:
   - **P0** (полный downtime): немедленный rollback через `make rollback TAG=<prev>`.
   - **P1** (деградация для <50% юзеров): диагностика 15 мин, потом rollback если не нашли root cause.
   - **P2** (Sentry ошибка у пары юзеров): тикет в backlog, фиксим в следующем спринте.
4. Постмортем в `docs/INCIDENTS/YYYY-MM-DD-<topic>.md` в течение 72 часов для P0/P1.

## Runbook ссылок

- `docs/SECRETS_ROTATION.md` — ротация при компрометации
- `deploy/Makefile` — все прод-операции
- `scripts/backup.sh` — резервирование + restore
