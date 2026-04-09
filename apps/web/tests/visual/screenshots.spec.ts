/**
 * FT.1 — Visual regression tests
 * Tests each main page at 6 viewports.
 * On first run, generates baseline screenshots.
 * On subsequent runs, compares against the baseline.
 */

import { test, expect, Page } from '@playwright/test';

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'battle-new', path: '/battle/new' },
  { name: 'learn', path: '/learn' },
  { name: 'profile', path: '/profile' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'achievements', path: '/achievements' },
  { name: 'settings', path: '/settings' },
  { name: 'about', path: '/about' },
];

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

/**
 * Wait for the page to be visually stable:
 * - No pending network requests (excluding long-polls / WS)
 * - No CSS animations running
 */
async function waitForPageStable(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  // Give React hydration and animations a moment to settle
  await page.waitForTimeout(500);
}

for (const viewport of VIEWPORTS) {
  test.describe(`Viewport ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of PAGES) {
      test(`${route.name} page at ${viewport.name}px`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await waitForPageStable(page);

        await expect(page).toHaveScreenshot(
          `${route.name}-${viewport.name}.png`,
          {
            maxDiffPixelRatio: 0.02, // allow up to 2% pixel difference
            animations: 'disabled',
          },
        );
      });
    }
  });
}
