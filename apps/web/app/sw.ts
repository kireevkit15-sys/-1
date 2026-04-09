import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

// Pages to precache for offline access
const OFFLINE_PAGE = "/offline";
const MAIN_PAGES = ["/", "/learn", "/profile", "/battle/new"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API calls — NetworkFirst with 5s timeout, fallback to cache
    {
      matcher: ({ url }) => url.pathname.startsWith("/v1/"),
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
      }),
    },
    // Question data — NetworkFirst with longer cache for offline quiz
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/v1/modules") ||
        url.pathname.startsWith("/v1/warmup"),
      handler: new NetworkFirst({
        cacheName: "question-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          }),
        ],
      }),
    },
    // Main pages — CacheFirst after initial load
    {
      matcher: ({ request, url }) =>
        request.mode === "navigate" &&
        MAIN_PAGES.some((p) => url.pathname === p),
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          }),
        ],
      }),
    },
    // Spread default cache strategies for everything else
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Offline fallback — serve /offline page for navigation requests when network fails
self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open("pages-cache");
        const cached = await cache.match(OFFLINE_PAGE);
        return cached ?? Response.error();
      }),
    );
  }
});

// Push notification handler
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {
    title: "РАЗУМ",
    body: "У тебя новое уведомление",
    url: "/",
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "РАЗУМ", {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
    }),
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
