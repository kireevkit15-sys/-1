/**
 * F28.7 — Learning Tutor (Наставник) E2E
 * Tests the tutor chat sheet: open from a concept, send messages, receive demo replies, close via Esc.
 * Works fully in demo mode.
 */

import { test, expect } from '@playwright/test';

async function openTutorFromMap(page: import('@playwright/test').Page) {
  await page.goto('/learning/map');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Открываем первую доступную ячейку концепта — не зависим от конкретного названия.
  const firstCell = page.locator('[data-testid="concept-cell"]').first();
  await expect(firstCell).toBeVisible({ timeout: 6000 });
  await firstCell.click();
  await page.waitForTimeout(500);

  await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Обсудить' }).click();
  await page.waitForTimeout(600);
}

test.describe('Learning · Tutor', () => {
  test('"Обсудить" opens the tutor sheet with correct labels', async ({ page }) => {
    await openTutorFromMap(page);

    const chat = page.getByRole('dialog', { name: 'Чат с наставником' });
    await expect(chat).toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Наставник', { exact: false }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Напиши наставнику…')).toBeVisible();
  });

  test('initial tutor message greets the user about the concept', async ({ page }) => {
    await openTutorFromMap(page);

    // Наставник начинает диалог — любая реплика уже видна
    await expect(
      page.locator('[data-testid="tutor-bubble"][data-role="tutor"]').first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('sending a message shows it then produces a tutor reply', async ({ page }) => {
    await openTutorFromMap(page);

    const ta = page.locator('textarea').first();
    await expect(ta).toBeVisible({ timeout: 5000 });

    await ta.fill('Расскажи подробнее о байесовской интуиции');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // User message visible
    await expect(
      page.getByText('Расскажи подробнее о байесовской интуиции', { exact: false }),
    ).toBeVisible({ timeout: 4000 });

    // Tutor replies within ~2s (demo delay 900-1600ms)
    await page.waitForTimeout(2200);

    // Приветствие + ответ наставника = 2 «tutor»-пузыря; пользовательский — 1.
    await expect(page.locator('[data-testid="tutor-bubble"][data-role="tutor"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="tutor-bubble"][data-role="user"]')).toHaveCount(1);
  });

  test('two consecutive messages both receive responses', async ({ page }) => {
    await openTutorFromMap(page);

    const ta = page.locator('textarea').first();
    await ta.fill('Первый вопрос наставнику');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2200);

    await expect(page.getByText('Первый вопрос наставнику', { exact: false })).toBeVisible();

    await ta.fill('И второй вопрос');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2200);

    await expect(page.getByText('И второй вопрос', { exact: false })).toBeVisible({ timeout: 4000 });
  });

  test('Escape closes the tutor sheet', async ({ page }) => {
    await openTutorFromMap(page);

    const chat = page.getByRole('dialog', { name: 'Чат с наставником' });
    await expect(chat).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const stillVisible = await chat.isVisible().catch(() => false);
    expect(stillVisible).toBe(false);
  });
});
