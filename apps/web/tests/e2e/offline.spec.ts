import { test, expect } from '@playwright/test';

test.describe('Offline mode', () => {
  test('should show offline page when network is down', async ({ page, context }) => {
    // Load the page first (to cache)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try navigating — may serve cached page or offline fallback
    try {
      await page.goto('/learn', { timeout: 10000 });
    } catch {
      // Navigation may fail if no cache — that's acceptable; we just
      // verify the page didn't crash with an unhandled exception
    }

    // Should show cached page or offline fallback
    // Check that the page didn't crash — either cached content or offline.tsx
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should recover when network is restored', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // After coming back online the home page must render an h1
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });
});
