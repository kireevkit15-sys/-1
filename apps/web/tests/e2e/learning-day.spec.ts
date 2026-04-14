/**
 * F28.2 — Learning Day E2E
 *
 * Flow: /learning/day → scroll through cards → Quiz (choose answer, see analysis
 * for all options) → Explain (submit text, get AI verdict caught/partial/missed).
 *
 * The page works in demo mode (DEMO_LESSON in apps/web/app/(main)/learning/day/page.tsx)
 * — no backend required.
 */

import { test, expect } from '@playwright/test';

// Helper: scroll the learning feed container down by one viewport.
async function scrollFeedDown(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const feed = document.querySelector('.learning-feed') as HTMLElement | null;
    if (feed) {
      feed.scrollBy({ top: window.innerHeight, behavior: 'instant' as ScrollBehavior });
    }
  });
  // Give IntersectionObserver time to update activeIndex.
  await page.waitForTimeout(450);
}

// Helper: scroll until a given section (by aria-label) is visible in viewport.
async function scrollToSection(
  page: import('@playwright/test').Page,
  label: string,
  maxScrolls = 12,
) {
  const section = page.locator(`section[aria-label="${label}"]`);
  for (let i = 0; i < maxScrolls; i++) {
    if (await section.isVisible().catch(() => false)) {
      const inView = await section.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.7 && r.bottom > window.innerHeight * 0.2;
      }).catch(() => false);
      if (inView) return;
    }
    await scrollFeedDown(page);
  }
}

test.describe('Learning — Day lesson', () => {
  test('page loads with day header and topic title', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/День\s*14/)).toBeVisible({ timeout: 8000 });
    // Text may be truncated in the sticky header — match partial
    await expect(page.getByText(/Решение без полной/).first()).toBeVisible({
      timeout: 8000,
    });

    // Progress label "1 / N"
    await expect(page.getByText(/1\s*\/\s*\d+/).first()).toBeVisible({ timeout: 8000 });
  });

  test('progress indicator updates when scrolling through cards', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');

    const progressLabel = page.locator('[aria-label^="Карточка "]').first();
    await expect(progressLabel).toBeVisible({ timeout: 8000 });

    const initial = (await progressLabel.textContent())?.trim() ?? '';
    expect(initial).toMatch(/^1\s*\/\s*\d+$/);

    // Scroll down a few cards
    await scrollFeedDown(page);
    await scrollFeedDown(page);
    await scrollFeedDown(page);

    const updated = (await progressLabel.textContent())?.trim() ?? '';
    expect(updated).toMatch(/^\d+\s*\/\s*\d+$/);
    expect(updated).not.toBe(initial);
  });

  test('quiz accepts an answer and reveals analysis for all options', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');

    await scrollToSection(page, 'Проверка');

    const quiz = page.locator('section[aria-label="Проверка"]');
    await expect(quiz).toBeVisible({ timeout: 8000 });
    await expect(
      quiz.getByText(/Перед тобой выбор: действовать на 40%/),
    ).toBeVisible({ timeout: 5000 });

    // 4 option buttons
    const options = quiz.locator('button[aria-pressed]');
    await expect(options).toHaveCount(4, { timeout: 5000 });

    // Click the 3rd option (correct answer — "Смотреть на цену ошибки...")
    await options.nth(2).click();

    // After answering, each option shows "Верно" or "Мимо" label.
    // Correct option (index 2) should show "Верно".
    await expect(quiz.getByText('Верно', { exact: false }).first()).toBeVisible({
      timeout: 5000,
    });
    // Incorrect options show "Мимо" — expect at least one visible.
    await expect(quiz.getByText('Мимо', { exact: false }).first()).toBeVisible({
      timeout: 5000,
    });

    // All 4 options should now be disabled (answered = true).
    const disabledCount = await quiz.locator('button[aria-pressed][disabled]').count();
    expect(disabledCount).toBe(4);
  });

  test('ExplainCard returns "missed" verdict for a very short answer', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');

    await scrollToSection(page, 'Своими словами');

    const explain = page.locator('section[aria-label="Своими словами"]');
    await expect(explain).toBeVisible({ timeout: 8000 });

    const textarea = explain.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Коротко');

    await explain.getByRole('button', { name: 'Отправить' }).click();

    // Stub has ~900ms delay; < 8 words → missed.
    await expect(explain.getByText('Не уловил')).toBeVisible({ timeout: 8000 });
  });

  test('ExplainCard returns "caught" verdict for a detailed answer (≥25 words)', async ({
    page,
  }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');

    await scrollToSection(page, 'Своими словами');

    const explain = page.locator('section[aria-label="Своими словами"]');
    await expect(explain).toBeVisible({ timeout: 8000 });

    const longAnswer =
      'Решать пора тогда, когда цена промедления становится выше цены возможной ошибки. ' +
      'Порог достаточности — это минимум фактов, без которого решение превращается в лотерею, ' +
      'всё что сверх — уже роскошь ожидания, которая сама имеет измеримую стоимость во времени и упущенных возможностях.';

    const textarea = explain.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(longAnswer);

    await explain.getByRole('button', { name: 'Отправить' }).click();

    await expect(explain.getByText('Уловил', { exact: true })).toBeVisible({
      timeout: 8000,
    });

    // Reset button should be available after result.
    await expect(
      explain.getByRole('button', { name: 'Переписать' }),
    ).toBeVisible({ timeout: 3000 });
  });
});
