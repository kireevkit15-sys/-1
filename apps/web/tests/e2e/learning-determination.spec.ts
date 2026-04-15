/**
 * F28.1 — Learning Determination E2E
 * Tests the 5-situation "Определение" flow that names the user's level (СПЯЩИЙ).
 * Works without backend — 5 situations are bundled from determination-situations.json.
 */

import { test, expect } from '@playwright/test';

test.describe('Learning · Determination', () => {
  test('intro screen shows label, headline and start button', async ({ page }) => {
    await page.goto('/learning/determination');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    await expect(page.getByText('— Определение —')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/Пять ситуаций/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Начать' })).toBeVisible();
  });

  test('starts the flow and shows 5 progress dots with first situation', async ({ page }) => {
    await page.goto('/learning/determination');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    await page.getByRole('button', { name: 'Начать' }).click();
    await page.waitForTimeout(500);

    // 5 progress dots
    const dots = page.locator('[data-testid="progress-dot"]');
    await expect(dots.first()).toBeVisible({ timeout: 5000 });
    await expect(dots).toHaveCount(5);

    // First situation title — one of the known titles
    const firstTitles = [
      'Карьерный тупик',
      'Информационный шум',
      'Спор за столом',
      'Конфликт в команде',
      'Решение без данных',
    ];
    let found = false;
    for (const t of firstTitles) {
      if (await page.getByText(t, { exact: false }).first().isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);

    await expect(page.getByText('Выбери своё')).toBeVisible({ timeout: 5000 });
  });

  test('shows 4 option buttons per situation', async ({ page }) => {
    await page.goto('/learning/determination');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Начать' }).click();
    await page.waitForTimeout(500);

    // Ровно 4 опции на ситуацию — селектор детерминированный.
    await page.waitForSelector('text=Выбери своё', { timeout: 5000 });
    const optionButtons = page.locator('[data-testid="determination-option"]');
    await expect(optionButtons).toHaveCount(4);
  });

  test('clicking an option advances through all 5 situations to the final screen', async ({ page }) => {
    await page.goto('/learning/determination');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Начать' }).click();
    await page.waitForTimeout(500);

    const situationTitles = [
      'Карьерный тупик',
      'Информационный шум',
      'Спор за столом',
      'Конфликт в команде',
      'Решение без данных',
    ];

    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('text=Выбери своё', { timeout: 5000 });
      await page.locator('[data-testid="determination-option"]').first().click();
      // Exit animation ~400ms, then next situation
      await page.waitForTimeout(650);
    }

    // Final screen
    await expect(page.getByText('Ты назван')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/Твой уровень/i)).toBeVisible();
    await expect(page.getByText('СПЯЩИЙ', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('final "Войти" button redirects to /learning', async ({ page }) => {
    await page.goto('/learning/determination');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: 'Начать' }).click();
    await page.waitForTimeout(500);

    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('text=Выбери своё', { timeout: 5000 });
      await page.locator('[data-testid="determination-option"]').first().click();
      await page.waitForTimeout(650);
    }

    await page.waitForSelector('text=СПЯЩИЙ', { timeout: 8000 });
    await page.getByRole('button', { name: 'Войти' }).click();

    await page.waitForURL('**/learning', { timeout: 8000 });
    expect(page.url()).toMatch(/\/learning$/);
  });
});
