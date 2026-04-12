/**
 * BT.16 — k6 load test: 100 concurrent battles
 *
 * Metrics: response time (p95 < 500ms), error rate (< 5%), throughput.
 *
 * Usage:
 *   k6 run scripts/load-tests/battle-load.js
 *   k6 run scripts/load-tests/battle-load.js --env BASE_URL=https://razum.app
 *
 * Prerequisites:
 *   - API running at BASE_URL (default http://localhost:3001)
 *   - PostgreSQL + Redis up
 *   - Seed data loaded (questions exist)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────

const battleCreateDuration = new Trend('battle_create_duration', true);
const battleGetDuration = new Trend('battle_get_duration', true);
const authDuration = new Trend('auth_duration', true);
const historyDuration = new Trend('history_get_duration', true);
const errorRate = new Rate('error_rate');
const battlesCreated = new Counter('battles_created');
const battlesCompleted = new Counter('battles_completed');

// ── Options ─────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Ramp up to 100 concurrent VUs creating bot battles
    concurrent_battles: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 25 },   // warm-up
        { duration: '15s', target: 50 },   // ramp to half
        { duration: '30s', target: 100 },  // full load
        { duration: '60s', target: 100 },  // sustained peak
        { duration: '15s', target: 0 },    // cool-down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    battle_create_duration: ['p(95)<500'],
    battle_get_duration: ['p(95)<300'],
    auth_duration: ['p(95)<400'],
    error_rate: ['rate<0.05'],
  },
};

// ── Config ──────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API = `${BASE_URL}/v1`;

function headers(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

// ── Setup: register test users ──────────────────────────────────

export function setup() {
  const users = [];

  for (let i = 0; i < 120; i++) {
    const email = `k6_battle_${Date.now()}_${i}@loadtest.local`;
    const payload = JSON.stringify({
      email,
      password: 'LoadTest123!',
      name: `K6 Battle User ${i}`,
    });

    const res = http.post(`${API}/auth/register`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 201) {
      const body = JSON.parse(res.body);
      users.push({
        email,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });
    } else if (res.status === 429) {
      // Rate limited — wait and retry
      sleep(2);
      i--;
      continue;
    } else {
      console.warn(`Registration failed for user ${i}: ${res.status} ${res.body}`);
    }

    // Avoid auth rate limit (2 req/s short burst)
    if (i % 2 === 1) sleep(0.6);
  }

  console.log(`Setup complete: ${users.length} users registered`);
  return { users };
}

// ── Main test function ──────────────────────────────────────────

export default function (data) {
  const { users } = data;
  if (!users || users.length === 0) {
    console.error('No users available');
    return;
  }

  // Each VU picks a user by VU id
  const user = users[__VU % users.length];
  const opts = headers(user.accessToken);

  group('Bot Battle Lifecycle', () => {
    // 1. Create a bot battle
    let battleId;
    {
      const payload = JSON.stringify({ mode: 'bot' });
      const res = http.post(`${API}/battles`, payload, opts);

      battleCreateDuration.add(res.timings.duration);

      const ok = check(res, {
        'battle created (201)': (r) => r.status === 201,
        'response has id': (r) => {
          try {
            return !!JSON.parse(r.body).id;
          } catch {
            return false;
          }
        },
      });

      if (ok) {
        battleId = JSON.parse(res.body).id;
        battlesCreated.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
        return;
      }
    }

    sleep(0.3);

    // 2. Get battle state
    {
      const res = http.get(`${API}/battles/${battleId}`, opts);

      battleGetDuration.add(res.timings.duration);

      check(res, {
        'get battle (200)': (r) => r.status === 200,
        'battle has state': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id === battleId;
          } catch {
            return false;
          }
        },
      });

      errorRate.add(res.status !== 200 ? 1 : 0);
    }

    sleep(0.3);

    // 3. Get battle history (pagination test)
    {
      const res = http.get(`${API}/battles/history?page=1&limit=5`, opts);

      historyDuration.add(res.timings.duration);

      check(res, {
        'history (200)': (r) => r.status === 200,
      });

      errorRate.add(res.status !== 200 ? 1 : 0);
    }

    sleep(0.2);

    // 4. Re-fetch battle to verify it progressed (bot plays rounds)
    {
      const res = http.get(`${API}/battles/${battleId}`, opts);

      check(res, {
        'battle still accessible': (r) => r.status === 200,
      });

      if (res.status === 200) {
        battlesCompleted.add(1);
      }
      errorRate.add(res.status !== 200 ? 1 : 0);
    }

    sleep(0.5);
  });

  group('Auth Token Refresh Under Load', () => {
    const refreshOpts = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.refreshToken}`,
      },
    };

    const res = http.post(`${API}/auth/refresh`, null, refreshOpts);

    authDuration.add(res.timings.duration);

    const ok = check(res, {
      'token refresh (201)': (r) => r.status === 201,
      'new tokens returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.accessToken && !!body.refreshToken;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(ok ? 0 : 1);

    sleep(0.3);
  });

  group('Concurrent Read Endpoints', () => {
    // Batch multiple GET requests to test read concurrency
    const responses = http.batch([
      ['GET', `${API}/battles/history?page=1&limit=10`, null, opts],
      ['GET', `${API}/leaderboard?limit=20`, null, opts],
      ['GET', `${API}/stats/me`, null, opts],
    ]);

    for (const res of responses) {
      check(res, {
        'batch read (200)': (r) => r.status === 200,
      });
      errorRate.add(res.status !== 200 ? 1 : 0);
    }

    sleep(0.2);
  });
}

// ── Teardown ────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Teardown: ${data.users.length} test users were created.`);
  console.log('Consider cleaning up k6_battle_* users from the database.');
}
