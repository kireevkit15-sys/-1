export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Защищённые маршруты — всё кроме:
     * - /login (страница авторизации)
     * - /api/auth (NextAuth API routes)
     * - /_next (Next.js internals)
     * - /manifest.json, /sw.js, workbox-*, /icons (PWA assets)
     * - favicon.ico
     */
    "/((?!login|api/auth|_next|manifest\\.json|sw\\.js|workbox-.*|icons|favicon\\.ico).*)",
  ],
};
