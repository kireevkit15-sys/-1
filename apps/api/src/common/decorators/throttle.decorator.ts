import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Rate limit presets for different endpoint categories.
 *
 * Usage:
 *   @ThrottleAuth()          — 5 requests/min  (login, register, telegram)
 *   @ThrottleAi()            — 10 requests/min (dialogue, generate)
 *   @ThrottleWarmup()        — 1 request/min   (warmup submit)
 *   @ThrottlePublic()        — skip throttle   (health, ready)
 */

/** Auth endpoints: 5 attempts per minute */
export const ThrottleAuth = () =>
  Throttle({
    short: { ttl: 1000, limit: 2 },
    medium: { ttl: 60000, limit: 5 },
    long: { ttl: 3600000, limit: 60 },
  });

/** AI endpoints: 10 requests per minute */
export const ThrottleAi = () =>
  Throttle({
    short: { ttl: 1000, limit: 3 },
    medium: { ttl: 60000, limit: 10 },
    long: { ttl: 3600000, limit: 200 },
  });

/** Warmup submit: 1 request per minute */
export const ThrottleWarmup = () =>
  Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 1 },
    long: { ttl: 3600000, limit: 60 },
  });

/** Skip throttle entirely (health checks, readiness probes) */
export const ThrottlePublic = () => SkipThrottle();
