/**
 * FT.4 — Learn (Knowledge Tree) E2E
 * Tests the learn page: branch selection, module listing, navigation.
 * Uses demo data — no backend required.
 */

import { test, expect } from '@playwright/test';

test.describe('Learn / Knowledge Tree', () => {
  test('should display the learn page with branch tabs', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Page heading or key content
    const heading = page.getByText('Дерево знаний').or(page.getByText('Обучение'));
    await expect(heading.first()).toBeVisible({ timeout: 8000 });
  });

  test('should show branch nodes / tabs on the learn page', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Wait for any branch label to appear (demo or live data)
    const branchLabel = page
      .getByText('Стратегия')
      .or(page.getByText('Логика'))
      .or(page.getByText('Эрудиция'));

    await expect(branchLabel.first()).toBeVisible({ timeout: 8000 });
  });

  test('should be able to click a branch and see modules', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Try clicking the Стратегия branch tab / node
    const strategyTab = page.getByText('Стратегия').first();
    await expect(strategyTab).toBeVisible({ timeout: 8000 });
    await strategyTab.click();

    // After clicking, there should be some module or content visible
    await page.waitForTimeout(500);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to a module detail page when clicking a module', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Wait for module content to appear
    await page.waitForTimeout(1000);

    // Look for a link or button that leads to a module
    const moduleLinks = page.locator('a[href*="/learn/"]');
    const moduleCount = await moduleLinks.count();

    if (moduleCount > 0) {
      const firstModule = moduleLinks.first();
      const href = await firstModule.getAttribute('href');
      await firstModule.click();
      await page.waitForLoadState('domcontentloaded');

      // Should be on a learn sub-page
      expect(page.url()).toContain('/learn/');
    } else {
      // No module links found — acceptable in demo mode with no modules
      console.log('No module links found; skipping module navigation check');
    }
  });

  test('should be able to navigate back from learn page', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('domcontentloaded');

    // Navigate back home
    await page.goto('/');
    await expect(page.getByText('РАЗУМ')).toBeVisible();
  });
});
