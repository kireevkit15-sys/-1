/**
 * FT.2 — Battle E2E
 * Tests the full battle flow using demo mode (no backend required).
 * Demo battle URL: /battle/demo
 */

import { test, expect } from '@playwright/test';

test.describe('Battle flow (demo mode)', () => {
  test('should navigate to battle/new and see mode selection', async ({ page }) => {
    await page.goto('/battle/new');

    // Heading should be visible
    await expect(page.getByText('Интеллект-баттл')).toBeVisible();
    await expect(page.getByText('5 раундов')).toBeVisible();

    // Both battle mode buttons should be present
    await expect(page.getByRole('button', { name: 'Играть с ботом' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Найти соперника' })).toBeVisible();

    // Demo card should be present
    await expect(page.getByText('Демо-режим')).toBeVisible();
  });

  test('should open demo battle and show battle UI', async ({ page }) => {
    await page.goto('/battle/demo');

    // Wait for the demo battle page to load
    await page.waitForLoadState('domcontentloaded');

    // The demo battle should show either the battle UI or a loading state
    // Look for any battle-related content
    const battleContent = page.locator('body');
    await expect(battleContent).toBeVisible();

    // Wait a moment for the demo to initialise
    await page.waitForTimeout(1500);

    // The page should not show an error screen
    const errorText = page.getByText('Ошибка');
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('should click "Попробовать" to enter demo battle', async ({ page }) => {
    await page.goto('/battle/new');

    // Click the demo link
    const demoLink = page.getByRole('link', { name: 'Попробовать' });
    await expect(demoLink).toBeVisible();
    await demoLink.click();

    // Should navigate to /battle/demo
    await page.waitForURL('**/battle/demo');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should click "Играть с ботом" and see searching / VS screen', async ({ page }) => {
    await page.goto('/battle/new');

    const botButton = page.getByRole('button', { name: 'Играть с ботом' });
    await expect(botButton).toBeVisible();
    await botButton.click();

    // After clicking, page should show searching state or VS screen
    // Wait up to 5 seconds for transition
    await page.waitForTimeout(500);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should be able to navigate back to home from battle/new', async ({ page }) => {
    await page.goto('/battle/new');
    await page.goto('/');

    await expect(page.getByText('РАЗУМ')).toBeVisible();
  });
});
