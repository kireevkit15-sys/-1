import { test, expect } from '@playwright/test';

test('no significant memory leak after 5 page navigations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Get initial memory (Chrome-only API; returns 0 in other browsers)
  const initialMetrics = await page.evaluate(
    () => (performance as any).memory?.usedJSHeapSize ?? 0
  );

  // Navigate through pages 5 times
  const routes = ['/', '/battle/new', '/learn', '/profile', '/leaderboard'];
  for (let i = 0; i < 5; i++) {
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
    }
  }

  // Give GC a moment
  await page.waitForTimeout(500);

  // Get final memory
  const finalMetrics = await page.evaluate(
    () => (performance as any).memory?.usedJSHeapSize ?? 0
  );

  // Memory should not have grown more than 50 MB
  if (initialMetrics > 0 && finalMetrics > 0) {
    const growth = finalMetrics - initialMetrics;
    expect(growth).toBeLessThan(50 * 1024 * 1024);
  }
});
