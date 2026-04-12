/**
 * BT.17 — k6 WebSocket load test: 200 concurrent connections
 *
 * Metrics: connection time, broadcast latency, error rate, concurrent sockets.
 *
 * Usage:
 *   k6 run scripts/load-tests/websocket-load.js
 *   k6 run scripts/load-tests/websocket-load.js --env BASE_URL=http://localhost:3001
 *
 * Prerequisites:
 *   - API + WebSocket gateway running
 *   - PostgreSQL + Redis up
 *   - Seed data loaded
 *
 * Note: k6 WebSocket support uses the k6/ws module (raw WS).
 *       Socket.IO uses WS under the hood — we connect via the
 *       Engine.IO upgrade path: /battle/socket.io/?EIO=4&transport=websocket
 */

import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────

const wsConnectDuration = new Trend('ws_connect_duration', true);
const wsMessageLatency = new Trend('ws_message_latency', true);
const wsErrorRate = new Rate('ws_error_rate');
const wsConnections = new Counter('ws_connections_total');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsActiveConnections = new Gauge('ws_active_connections');

// ── Options ─────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // 200 concurrent WebSocket connections
    ws_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },    // warm-up
        { duration: '15s', target: 100 },   // ramp
        { duration: '15s', target: 200 },   // full load
        { duration: '60s', target: 200 },   // sustained peak
        { duration: '15s', target: 0 },     // cool-down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    ws_connect_duration: ['p(95)<2000'],
    ws_message_latency: ['p(95)<500'],
    ws_error_rate: ['rate<0.05'],
  },
};

// ── Config ──────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API = `${BASE_URL}/v1`;
const WS_URL = BASE_URL.replace('http', 'ws');

// ── Setup: register users for WS auth ───────────────────────────

export function setup() {
  const users = [];

  for (let i = 0; i < 220; i++) {
    const email = `k6_ws_${Date.now()}_${i}@loadtest.local`;
    const payload = JSON.stringify({
      email,
      password: 'LoadTest123!',
      name: `K6 WS User ${i}`,
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
    }

    if (i % 2 === 1) sleep(0.6);
  }

  console.log(`Setup: ${users.length} users registered for WebSocket test`);
  return { users };
}

// ── Helpers: Socket.IO protocol over raw WS ─────────────────────

// Socket.IO packet types: 0=CONNECT, 2=EVENT, 3=ACK, 4=ERROR, 40=CONNECT(ns), 42=EVENT(ns)
function encodeSocketIOConnect(namespace, auth) {
  // Socket.IO v4: "40/namespace,{auth}"
  return `40${namespace},${JSON.stringify(auth)}`;
}

function encodeSocketIOEvent(namespace, event, data) {
  // Socket.IO v4: "42/namespace,["event", data]"
  return `42${namespace},${JSON.stringify([event, data])}`;
}

function parseSocketIOMessage(raw) {
  // Engine.IO ping
  if (raw === '2') return { type: 'ping' };
  // Engine.IO pong
  if (raw === '3') return { type: 'pong' };

  // Socket.IO namespace connect ack: "40/battle,{...}"
  const nsConnectMatch = raw.match(/^40\/([^,]+),?(.*)/);
  if (nsConnectMatch) {
    return {
      type: 'ns_connect',
      namespace: nsConnectMatch[1],
      data: nsConnectMatch[2] ? JSON.parse(nsConnectMatch[2]) : {},
    };
  }

  // Socket.IO event: "42/battle,["event", data]"
  const eventMatch = raw.match(/^42\/([^,]+),(.*)/);
  if (eventMatch) {
    const parsed = JSON.parse(eventMatch[2]);
    return {
      type: 'event',
      namespace: eventMatch[1],
      event: parsed[0],
      data: parsed[1],
    };
  }

  // Socket.IO error: "44/battle,{...}"
  const errorMatch = raw.match(/^44\/([^,]+),(.*)/);
  if (errorMatch) {
    return {
      type: 'error',
      namespace: errorMatch[1],
      data: JSON.parse(errorMatch[2]),
    };
  }

  // Engine.IO open packet: "0{...}"
  if (raw.startsWith('0{')) {
    return { type: 'open', data: JSON.parse(raw.slice(1)) };
  }

  return { type: 'unknown', raw };
}

// ── Main test ───────────────────────────────────────────────────

export default function (data) {
  const { users } = data;
  if (!users || users.length === 0) return;

  const user = users[__VU % users.length];
  const wsEndpoint = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

  const connectStart = Date.now();
  let connected = false;
  let messagesCount = 0;

  const res = ws.connect(wsEndpoint, {}, function (socket) {
    wsActiveConnections.add(1);

    socket.on('open', () => {
      const connectTime = Date.now() - connectStart;
      wsConnectDuration.add(connectTime);
      wsConnections.add(1);
      connected = true;

      // Connect to /battle namespace with JWT auth
      socket.send(
        encodeSocketIOConnect('/battle', { token: user.accessToken }),
      );
    });

    socket.on('message', (msg) => {
      messagesCount++;
      wsMessagesReceived.add(1);
      const parsed = parseSocketIOMessage(msg);

      // Respond to Engine.IO pings
      if (parsed.type === 'ping') {
        socket.send('3'); // pong
        return;
      }

      // Namespace connected — start bot battle
      if (parsed.type === 'ns_connect' && parsed.namespace === 'battle') {
        wsErrorRate.add(0);

        // Create a bot battle via WebSocket
        const battleStart = Date.now();
        socket.send(
          encodeSocketIOEvent('/battle', 'battle:create_bot', {
            botLevel: 'STANDARD',
          }),
        );

        // Track latency from send to first response
        socket.on('message', function onBattleStarted(innerMsg) {
          const innerParsed = parseSocketIOMessage(innerMsg);
          if (
            innerParsed.type === 'event' &&
            innerParsed.event === 'battle:started'
          ) {
            wsMessageLatency.add(Date.now() - battleStart);
          }
        });
      }

      // Handle battle events
      if (parsed.type === 'event') {
        if (parsed.event === 'battle:error') {
          wsErrorRate.add(1);
        }
      }

      // Handle namespace errors
      if (parsed.type === 'error') {
        wsErrorRate.add(1);
      }
    });

    socket.on('error', () => {
      wsErrorRate.add(1);
    });

    socket.on('close', () => {
      wsActiveConnections.add(-1);
    });

    // Keep connection alive for sustained load measurement
    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });

  check(res, {
    'ws connection successful': () => connected,
    'received messages': () => messagesCount > 0,
  });

  wsErrorRate.add(connected ? 0 : 1);
  sleep(1);
}

// ── Teardown ────────────────────────────────────────────────────

export function teardown(data) {
  console.log(`Teardown: ${data.users.length} WS test users created.`);
  console.log('Consider cleaning up k6_ws_* users from the database.');
}
