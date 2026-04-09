/**
 * FT.5 — Warmup E2E
 * Tests the daily warmup flow with 5 demo questions.
 * No backend required — the page falls back to DEMO_QUESTIONS automatically.
 */

import { test, expect } from '@playwright/test';

test.describe('Daily Warmup', () => {
  test('should load the warmup page and show first question', async ({ page }) => {
    await page.goto('/warmup');
    await page.waitForLoadState('domcontentloaded');

    // Wait for loading spinner to disappear and question to appear
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Should show question counter like "1/5"
    const counter = page.getByText(/1\/5/);
    await expect(counter).toBeVisible({ timeout: 8000 });

    // Timer should be visible
    const timer = page.getByText(/\d+s/);
    await expect(timer).toBeVisible({ timeout: 5000 });
  });

  test('should show 4 answer options for each question', async ({ page }) => {
    await page.goto('/warmup');
    await page.waitForLoadState('domcontentloaded');

    // Wait for question to load
    await page.waitForTimeout(1500);

    // Look for option buttons (A, B, C, D labels)
    const optionA = page.getByText('A', { exact: true }).first();
    await expect(optionA).toBeVisible({ timeout: 8000 });
  });

  test('should accept an answer and show explanation + next button', async ({ page }) => {
    await page.goto('/warmup');
    await page.waitForLoadState('domcontentloaded');

    // Wait for question
    await page.waitForTimeout(1500);

    // Click the first answer option (index A)
    const firstOption = page.locator('button').filter({ hasText: /^[A-D]/ }).first();
    await expect(firstOption).toBeVisible({ timeout: 8000 });
    await firstOption.click();

    // Explanation should appear
    await expect(page.getByText('Объяснение')).toBeVisible({ timeout: 5000 });

    // "Следующий" or "Результат" button should appear
    const nextButton = page
      .getByRole('button', { name: 'Следующий' })
      .or(page.getByRole('button', { name: 'Результат' }));
    await expect(nextButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('should complete 5 questions and show result screen', async ({ page }) => {
    await page.goto('/warmup');
    await page.waitForLoadState('domcontentloaded');

    // Complete all 5 questions
    for (let q = 0; q < 5; q++) {
      // Wait for question to be loaded (counter or timer visible)
      await page.waitForTimeout(800);

      // Click first visible answer button
      const answerButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full') });
      const count = await answerButtons.count();

      if (count > 0) {
        await answerButtons.first().click();
      } else {
        // Fallback: click any large button that might be an answer option
        const fallback = page.locator('button[class*="rounded-xl"][class*="border"]').first();
        if (await fallback.isVisible()) {
          await fallback.click();
        }
      }

      // Wait for explanation to appear, then click Next/Result
      await page.waitForTimeout(400);

      const nextButton = page
        .getByRole('button', { name: 'Следующий' })
        .or(page.getByRole('button', { name: 'Результат' }));

      const isVisible = await nextButton.first().isVisible().catch(() => false);
      if (isVisible) {
        await nextButton.first().click();
      }
    }

    // Result screen should appear
    await expect(page.getByText('Разминка завершена!')).toBeVisible({ timeout: 8000 });
  });

  test('should display streak on the result screen', async ({ page }) => {
    await page.goto('/warmup');
    await page.waitForLoadState('domcontentloaded');

    // Answer all questions quickly
    for (let q = 0; q < 5; q++) {
      await page.waitForTimeout(600);

      const answerButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full') });
      const count = await answerButtons.count();
      if (count > 0) {
        await answerButtons.first().click();
      }

      await page.waitForTimeout(300);
      const nextButton = page
        .getByRole('button', { name: 'Следующий' })
        .or(page.getByRole('button', { name: 'Результат' }));
      const isVisible = await nextButton.first().isVisible().catch(() => false);
      if (isVisible) {
        await nextButton.first().click();
      }
    }

    // Result screen
    await page.waitForSelector('text=Разминка завершена!', { timeout: 8000 });

    // Streak display — "дней подряд" should be visible
    await expect(page.getByText('дней подряд')).toBeVisible({ timeout: 5000 });

    // Motivational message should be visible
    const motivationTexts = [
      'Превосходно',
      'Отличная работа',
      'Хорошо',
      'Не сдавайся',
    ];
    let motivationFound = false;
    for (const text of motivationTexts) {
      const el = page.getByText(text, { exact: false });
      if (await el.isVisible().catch(() => false)) {
        motivationFound = true;
        break;
      }
    }
    expect(motivationFound).toBe(true);
  });

  test('should navigate back to home from result screen', async ({ page }) => {
    await page.goto('/warmup');
    await page.waitForLoadState('domcontentloaded');

    // Complete all questions
    for (let q = 0; q < 5; q++) {
      await page.waitForTimeout(600);
      const answerButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full') });
      if (await answerButtons.first().isVisible().catch(() => false)) {
        await answerButtons.first().click();
      }
      await page.waitForTimeout(300);
      const nextButton = page
        .getByRole('button', { name: 'Следующий' })
        .or(page.getByRole('button', { name: 'Результат' }));
      if (await nextButton.first().isVisible().catch(() => false)) {
        await nextButton.first().click();
      }
    }

    await page.waitForSelector('text=Разминка завершена!', { timeout: 8000 });

    // Click home button
    await page.getByRole('button', { name: 'На главную' }).click();
    await page.waitForURL('**/');
    await expect(page.getByText('РАЗУМ')).toBeVisible();
  });
});
