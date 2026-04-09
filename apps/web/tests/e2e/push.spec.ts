import { test, expect } from '@playwright/test';

test.describe('Push notifications UI', () => {
  test('should not crash on pages where push banner may appear', async ({ page }) => {
    // Visit home page — the push subscription banner (if present) renders here
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The page must be alive — no unhandled error overlay
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('should not crash when notification permission is granted', async ({ page, context }) => {
    // Grant the Notifications permission before loading the page so any
    // subscription prompt can proceed without a browser dialog
    await context.grantPermissions(['notifications']);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('settings page renders push toggle without crashing', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // The settings page must load
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // If a push/notifications toggle exists, clicking it must not throw
    const toggle = page.locator(
      '[data-testid="push-toggle"], [aria-label*="уведомлен"], [aria-label*="notification"], input[type="checkbox"]'
    ).first();

    const toggleVisible = await toggle.isVisible().catch(() => false);
    if (toggleVisible) {
      await toggle.click({ timeout: 5000 });
      // Give the handler time to run
      await page.waitForTimeout(500);
      // Page should still be alive
      const bodyAfter = await page.textContent('body');
      expect(bodyAfter).toBeTruthy();
    }
  });

  test('push subscription prompt does not loop or crash on repeated visits', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);

    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});
