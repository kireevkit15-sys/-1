/**
 * F28.8 — Visual regression tests for the learning system ("РАЗУМ")
 *
 * Captures first-screen screenshots of every learning route at 3 viewports:
 *   - mobile  (375x812)
 *   - tablet  (768x1024)
 *   - desktop (1024x768)
 *
 * All learning screens work in demo-mode without the backend, so no API mocks
 * are required. Snapshot filenames use the pattern `learning-<screen>-<vp>.png`
 * to avoid collisions with the existing `screenshots.spec.ts` baselines.
 *
 * Animations (aurora, framer-motion transitions) are disabled via injected CSS
 * so the snapshots stay deterministic.
 */

import { test, expect, Page } from '@playwright/test';

const SCREENS = [
  { name: 'hub', path: '/learning' },
  { name: 'determination', path: '/learning/determination' },
  { name: 'day', path: '/learning/day', extraWait: 1500 },
  { name: 'map', path: '/learning/map' },
  { name: 'barrier', path: '/learning/barrier' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 },
];

/**
 * Disable all CSS animations/transitions before taking a screenshot.
 * Aurora backgrounds on /learning/day and framer-motion enter-animations
 * make full-page captures flaky without this.
 */
async function freezeAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`Learning viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const screen of SCREENS) {
      test(`${screen.name} — ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' });

        // networkidle may hang if there are background polls; be tolerant
        await page.waitForLoadState('networkidle').catch(() => {});

        // /learning/day has aurora + font loading, extra settle time
        await page.waitForTimeout(screen.extraWait ?? 800);

        await freezeAnimations(page);
        // one more tick so the frozen styles apply
        await page.waitForTimeout(200);

        await expect(page).toHaveScreenshot(
          `learning-${screen.name}-${vp.name}.png`,
          {
            fullPage: false,
            maxDiffPixels: 500,
            animations: 'disabled',
          },
        );
      });
    }
  });
}
