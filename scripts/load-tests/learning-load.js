/**
 * L25.6 — k6 load test: 100 concurrent users going through the learning flow
 *
 * Scenario per VU:
 *   1. /learning/start  — create personal path
 *   2. /learning/today  — fetch day-1 cards
 *   3. /learning/interact ×8 (VIEW + 1 correct ANSWER on the quiz card)
 *   4. /learning/day/1/complete — close day, get adaptations
 *   5. /learning/today  — fetch day-2 cards
 *   6. /learning/mastery — knowledge map
 *   7. /learning/status — current level / day
 *
 * Metrics: latency per endpoint, error rate, days completed, paths started.
 *
 * Usage:
 *   k6 run scripts/load-tests/learning-load.js
 *   k6 run scripts/load-tests/learning-load.js --env BASE_URL=https://razum.app
 *
 * Prerequisites:
 *   - API running at BASE_URL (default http://localhost:3001)
 *   - PostgreSQL + Redis up
 *   - Seed data loaded (concepts + content)
 *
 * Cleanup:
 *   DELETE FROM "users" WHERE email LIKE 'k6_learning_%@loadtest.local';
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────

const startDuration = new Trend('learning_start_duration', true);
const todayDuration = new Trend('learning_today_duration', true);
const interactDuration = new Trend('learning_interact_duration', true);
const completeDayDuration = new Trend('learning_complete_day_duration', true);
const masteryDuration = new Trend('learning_mastery_duration', true);
const statusDuration = new Trend('learning_status_duration', true);
const errorRate = new Rate('error_rate');
const pathsStarted = new Counter('paths_started');
const daysCompleted = new Counter('days_completed');

// ── Options ─────────────────────────────────────────────────────

export const options = {
  scenarios: {
    concurrent_learners: {
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
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    learning_start_duration: ['p(95)<1500'],     // start builds the whole path → heavier
    learning_today_duration: ['p(95)<400'],
    learning_interact_duration: ['p(95)<300'],
    learning_complete_day_duration: ['p(95)<800'],
    learning_mastery_duration: ['p(95)<500'],
    learning_status_duration: ['p(95)<300'],
    error_rate: ['rate<0.05'],
  },
};

// ── Config ──────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API = `${BASE_URL}/v1`;

const TOTAL_CARDS = 8;
const QUIZ_CARD_INDEX = 4;
const IDEAL_TIME_MS = 12000;

function authHeaders(token) {
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
  const target = 120;

  for (let i = 0; i < target; i++) {
    const email = `k6_learning_${Date.now()}_${i}@loadtest.local`;
    const payload = JSON.stringify({
      email,
      password: 'LoadTest123!',
      name: `K6 Learner ${i}`,
    });

    const res = http.post(`${API}/auth/register`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 201) {
      const body = JSON.parse(res.body);
      users.push({ email, accessToken: body.accessToken });
    } else if (res.status === 429) {
      sleep(2);
      i--;
      continue;
    } else {
      console.warn(`Registration failed for user ${i}: ${res.status} ${res.body}`);
    }

    if (i % 2 === 1) sleep(0.6); // respect auth rate limit
  }

  console.log(`Setup complete: ${users.length} learners registered`);
  return { users };
}

// ── Main test function ──────────────────────────────────────────

export default function (data) {
  const { users } = data;
  if (!users || users.length === 0) {
    console.error('No users available');
    return;
  }

  const user = users[__VU % users.length];
  const opts = authHeaders(user.accessToken);

  // 1. Start the learning path
  group('Start learning path', () => {
    const payload = JSON.stringify({
      startZone: 'STRATEGY',
      painPoint: 'LOGIC',
      deliveryStyle: 'analytical',
    });
    const res = http.post(`${API}/learning/start`, payload, opts);
    startDuration.add(res.timings.duration);

    const ok = check(res, {
      'start returned 2xx': (r) => r.status >= 200 && r.status < 300,
      'start has path': (r) => {
        try {
          return !!JSON.parse(r.body).id || !!JSON.parse(r.body).pathId;
        } catch {
          return false;
        }
      },
    });
    if (ok) pathsStarted.add(1);
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.3);

  // 2. Fetch today's cards
  let dayId = null;
  group('Get today (day 1)', () => {
    const res = http.get(`${API}/learning/today`, opts);
    todayDuration.add(res.timings.duration);

    const ok = check(res, { 'today (200)': (r) => r.status === 200 });
    errorRate.add(ok ? 0 : 1);
    if (ok) {
      try {
        const body = JSON.parse(res.body);
        dayId = body.dayId || body.id || (body.day && body.day.id);
      } catch {
        // ignore
      }
    }
  });

  if (!dayId) {
    sleep(0.5);
    return;
  }

  sleep(0.2);

  // 3. Interact with all cards (VIEWs + quiz ANSWER)
  group('Interact ×8 (VIEW + correct quiz answer)', () => {
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const payload = JSON.stringify({
        dayId,
        cardIndex: i,
        type: 'VIEW',
        timeSpentMs: IDEAL_TIME_MS,
      });
      const res = http.post(`${API}/learning/interact`, payload, opts);
      interactDuration.add(res.timings.duration);
      const ok = check(res, { 'interact (201)': (r) => r.status === 201 });
      errorRate.add(ok ? 0 : 1);
    }

    const quizPayload = JSON.stringify({
      dayId,
      cardIndex: QUIZ_CARD_INDEX,
      type: 'ANSWER',
      timeSpentMs: IDEAL_TIME_MS,
      answer: 'correct',
    });
    const res = http.post(`${API}/learning/interact`, quizPayload, opts);
    interactDuration.add(res.timings.duration);
    const ok = check(res, { 'quiz answer (201)': (r) => r.status === 201 });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.3);

  // 4. Complete day 1
  group('Complete day 1', () => {
    const res = http.post(`${API}/learning/day/1/complete`, null, opts);
    completeDayDuration.add(res.timings.duration);

    const ok = check(res, {
      'complete day (201/200)': (r) => r.status === 201 || r.status === 200,
      'response has metrics': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.metrics || !!body.confidence || !!body.completedDay;
        } catch {
          return false;
        }
      },
    });
    if (ok) daysCompleted.add(1);
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.3);

  // 5. Get next day's cards (path advanced)
  group('Get today (day 2)', () => {
    const res = http.get(`${API}/learning/today`, opts);
    todayDuration.add(res.timings.duration);
    const ok = check(res, { 'today day-2 (200)': (r) => r.status === 200 });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.2);

  // 6. Knowledge map
  group('Knowledge mastery map', () => {
    const res = http.get(`${API}/learning/mastery`, opts);
    masteryDuration.add(res.timings.duration);
    const ok = check(res, {
      'mastery (200)': (r) => r.status === 200,
      'mastery has branches': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.branchStats || !!body.concepts;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.2);

  // 7. Status
  group('Learning status', () => {
    const res = http.get(`${API}/learning/status`, opts);
    statusDuration.add(res.timings.duration);
    const ok = check(res, { 'status (200)': (r) => r.status === 200 });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.5);
}

// ── Teardown ────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Teardown: ${data.users.length} learners were registered.`);
  console.log('Cleanup: DELETE FROM "users" WHERE email LIKE \'k6_learning_%@loadtest.local\';');
}
