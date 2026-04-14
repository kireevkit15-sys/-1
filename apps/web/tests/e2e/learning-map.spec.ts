/**
 * F28.6 — Learning Map E2E
 * Tests the knowledge-map: branch filters, search, concept detail bottom-sheet.
 * Works in demo mode without a backend.
 */

import { test, expect } from '@playwright/test';

test.describe('Learning · Map', () => {
  test('map loads with header, progress and branch chips', async ({ page }) => {
    await page.goto('/learning/map');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await expect(page.getByText('— Карта знаний —')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/\/\s*24/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('концептов освоено', { exact: false })).toBeVisible();

    // Progress bar
    await expect(page.locator('.bg-gradient-to-r.from-accent-warm').first()).toBeVisible();

    // Branch chips
    for (const name of ['Все ветки', 'Стратегия', 'Логика', 'Эрудиция', 'Риторика', 'Интуиция']) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('clicking "Логика" filters grid to logic concepts', async ({ page }) => {
    await page.goto('/learning/map');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    await page.getByText('Логика', { exact: false }).first().click();
    await page.waitForTimeout(500);

    const logicConcepts = [
      'Ошибка выжившего',
      'Байесовский подход',
      'Бритва Оккама',
      'Силлогизм',
      'Индукция Юма',
    ];

    for (const c of logicConcepts) {
      await expect(page.getByText(c, { exact: false }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('search narrows results to matching concept', async ({ page }) => {
    await page.goto('/learning/map');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    const search = page.getByPlaceholder('Поиск концепта…');
    await expect(search).toBeVisible({ timeout: 5000 });

    await search.fill('Байес');
    await page.waitForTimeout(400);

    await expect(page.getByText('Байесовский подход', { exact: false }).first()).toBeVisible({ timeout: 5000 });

    // A concept clearly out of scope should NOT be visible
    const outOfScope = page.getByText('Силлогизм', { exact: false }).first();
    const visible = await outOfScope.isVisible().catch(() => false);
    expect(visible).toBe(false);
  });

  test('clicking a concept opens bottom-sheet with actions', async ({ page }) => {
    await page.goto('/learning/map');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    await page.getByText('Логика', { exact: false }).first().click();
    await page.waitForTimeout(400);

    await page.getByText('Байесовский подход', { exact: false }).first().click();
    await page.waitForTimeout(500);

    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('button', { name: 'Обсудить' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Погрузиться' })).toBeVisible();
  });

  test('bottom-sheet can be closed via close button', async ({ page }) => {
    await page.goto('/learning/map');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    await page.getByText('Логика', { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByText('Байесовский подход', { exact: false }).first().click();
    await page.waitForTimeout(500);

    await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Закрыть' }).first().click();
    await page.waitForTimeout(500);

    const dialogVisible = await page.getByRole('dialog').first().isVisible().catch(() => false);
    expect(dialogVisible).toBe(false);
  });
});
