import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN_API;

if (dsn) {
  // Lazy-load profiling native binding — not available when skipping build scripts.
  let integrations: unknown[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { nodeProfilingIntegration } = require('@sentry/profiling-node') as {
      nodeProfilingIntegration: () => unknown;
    };
    integrations = [nodeProfilingIntegration()];
  } catch {
    // Native binding missing — continue without profiling.
  }

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'production',
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? 0.1),
    integrations: integrations as Parameters<typeof Sentry.init>[0] extends { integrations?: infer I } ? I : never,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
}
