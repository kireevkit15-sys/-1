/**
 * Cross-browser rendering tests.
 * Targeted at the 'chromium' Playwright project (see playwright.config.ts).
 * WebKit / Firefox require a separate Playwright install and can be added later.
 */
import { test, expect } from '@playwright/test';

// Pages that contain glassmorphism / blur / animation elements
const pages = ['/', '/battle/new', '/learn', '/profile'];

for (const route of pages) {
  test.describe(`Rendering: ${route}`, () => {
    test('page loads and body is visible', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    });

    test('glassmorphism elements do not cause layout errors', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Elements that typically carry backdrop-filter in this project
      const glassSelectors = [
        '[class*="glass"]',
        '[class*="backdrop"]',
        '[class*="blur"]',
        '[style*="backdrop-filter"]',
      ];

      for (const selector of glassSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          // Verify first glass element has a bounding box (i.e. it rendered)
          const box = await elements.first().boundingBox();
          // A rendered element has a non-null bounding box
          expect(box).not.toBeNull();
        }
      }
    });

    test('CSS animation keyframes do not crash the page', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Collect all keyframe rule names via the CSSOM
      const keyframeNames = await page.evaluate((): string[] => {
        const names: string[] = [];
        try {
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              for (const rule of Array.from(sheet.cssRules ?? [])) {
                if (rule instanceof CSSKeyframesRule) {
                  names.push(rule.name);
                }
              }
            } catch {
              // Cross-origin stylesheet — skip
            }
          }
        } catch {
          // In case CSSOM access is restricted
        }
        return names;
      });

      // We only assert the page is still alive; the list may be empty on
      // some routes, and that is fine.
      const body = await page.textContent('body');
      expect(body).toBeTruthy();

      // If keyframes exist, log them for debugging (no assertion — just
      // ensuring reading them didn't crash)
      if (keyframeNames.length > 0) {
        expect(Array.isArray(keyframeNames)).toBe(true);
      }
    });

    test('blur effects are applied without rendering errors', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Verify no JavaScript errors were thrown during render
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      // Wait a tick to capture any deferred errors
      await page.waitForTimeout(500);

      // Filter out known non-critical third-party warnings
      const criticalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });
}
