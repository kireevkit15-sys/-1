# Load Tests (k6)

## Установка k6

```bash
# Windows (choco)
choco install k6

# Windows (winget)
winget install grafana.k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Перед запуском

```bash
docker compose up -d          # PostgreSQL + Redis
pnpm db:migrate               # Миграции
pnpm db:seed                  # Seed данных (нужны вопросы)
pnpm --filter api run start:dev  # Запустить API
```

## Запуск тестов

### BT.16 — 100 concurrent баттлов
```bash
k6 run scripts/load-tests/battle-load.js
```

### BT.17 — 200 WebSocket подключений
```bash
k6 run scripts/load-tests/websocket-load.js
```

### L25.6 — 100 concurrent учеников проходят день обучения
```bash
k6 run scripts/load-tests/learning-load.js
```
Сценарий: register → /learning/start → /learning/today → 8 interactions →
/learning/day/1/complete → /learning/today (day 2) → /learning/mastery →
/learning/status. Ramp 25 → 50 → 100 VUs, 60s sustained peak.

### С кастомным URL
```bash
k6 run scripts/load-tests/battle-load.js --env BASE_URL=https://razum.app
```

## Пороги (thresholds)

### battle-load.js
| Метрика | Порог |
|---------|-------|
| HTTP p95 | < 500ms |
| HTTP p99 | < 1000ms |
| Battle create p95 | < 500ms |
| Battle get p95 | < 300ms |
| Error rate | < 5% |

### websocket-load.js
| Метрика | Порог |
|---------|-------|
| WS connect p95 | < 2000ms |
| WS message latency p95 | < 500ms |
| WS error rate | < 5% |

### learning-load.js
| Метрика | Порог |
|---------|-------|
| HTTP p95 / p99 | < 800ms / < 1500ms |
| /learning/start p95 | < 1500ms |
| /learning/today p95 | < 400ms |
| /learning/interact p95 | < 300ms |
| /learning/day/:n/complete p95 | < 800ms |
| /learning/mastery p95 | < 500ms |
| Error rate | < 5% |

## Очистка после тестов

```sql
DELETE FROM "users" WHERE email LIKE 'k6_%@loadtest.local';
DELETE FROM "users" WHERE email LIKE 'k6_learning_%@loadtest.local';
```
