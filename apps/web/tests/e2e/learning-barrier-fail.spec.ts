/**
 * F28.5 — Learning Barrier E2E (fail path)
 *
 * Flow: /learning/barrier → give minimal answers at every stage → verdict:
 * failed → see list of weak topics → press "Вернуться к повторению".
 *
 * Thresholds (apps/web/app/(main)/learning/barrier/page.tsx):
 *   short (<4 words) recall answer → verdict "red"       (not counted)
 *   short (<5 words) connect answer → verdict "missed"   (not counted)
 *   short (<15 words) apply answer  → verdict "missed"   (not counted)
 *   very short defend responses → outcome "lost"         → overall failed.
 */

import { test, expect } from '@playwright/test';

const SHORT_ANSWER = 'не';

async function failRecall(page: import('@playwright/test').Page) {
  for (let i = 0; i < 6; i++) {
    const stage = page.locator('section[aria-label="Вспомни"]');
    await expect(stage).toBeVisible({ timeout: 8000 });
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(SHORT_ANSWER);
    await stage.getByRole('button', { name: 'Ответить' }).click();
    // Verdict appears, then auto-advance (NEXT_DELAY_MS = 1200 ms).
    await page.waitForTimeout(1700);
  }
}

async function failConnect(page: import('@playwright/test').Page) {
  for (let i = 0; i < 3; i++) {
    const stage = page.locator('section[aria-label="Свяжи"]');
    await expect(stage).toBeVisible({ timeout: 8000 });
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(SHORT_ANSWER);
    await stage.getByRole('button', { name: 'Ответить' }).click();

    const nextButton = stage
      .getByRole('button', { name: 'Дальше' })
      .or(stage.getByRole('button', { name: 'Завершить' }));
    await expect(nextButton.first()).toBeVisible({ timeout: 8000 });
    await nextButton.first().click();
  }
}

async function failApply(page: import('@playwright/test').Page) {
  for (let i = 0; i < 2; i++) {
    const stage = page.locator('section[aria-label="Примени"]');
    await expect(stage).toBeVisible({ timeout: 8000 });
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(SHORT_ANSWER);
    await stage.getByRole('button', { name: 'Отправить' }).click();

    const nextButton = stage
      .getByRole('button', { name: 'Следующая' })
      .or(stage.getByRole('button', { name: 'Завершить' }));
    await expect(nextButton.first()).toBeVisible({ timeout: 8000 });
    await nextButton.first().click();
  }
}

async function failDefend(page: import('@playwright/test').Page) {
  const stage = page.locator('section[aria-label="Защити"]');
  await expect(stage).toBeVisible({ timeout: 8000 });

  for (let i = 0; i < 4; i++) {
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeEnabled({ timeout: 10000 });
    await textarea.fill(SHORT_ANSWER);
    const sendBtn = stage.getByRole('button', { name: 'Ответить' });
    await expect(sendBtn).toBeEnabled({ timeout: 5000 });
    await sendBtn.click();
  }
}

test.describe('Learning — Barrier (fail path)', () => {
  test.setTimeout(120_000);

  test('minimal answers drive the flow to the failed verdict', async ({ page }) => {
    await page.goto('/learning/barrier');
    await page.waitForLoadState('domcontentloaded');

    await failRecall(page);
    await failConnect(page);
    await failApply(page);
    await failDefend(page);

    await expect(page.getByText('— Испытание не пройдено —')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('failed verdict shows weak-topics list and no "passed" text', async ({ page }) => {
    await page.goto('/learning/barrier');
    await page.waitForLoadState('domcontentloaded');

    await failRecall(page);
    await failConnect(page);
    await failApply(page);
    await failDefend(page);

    await expect(page.getByText('— Испытание не пройдено —')).toBeVisible({
      timeout: 15_000,
    });
    // Sanity: "passed" label must NOT appear.
    await expect(page.getByText('— Испытание пройдено —')).toHaveCount(0);

    // At least one of the pooled weak topics should be visible.
    const weakTopics = [
      'Порог достаточности',
      'Цена промедления',
      'Обратимость решения',
    ];
    let foundAny = false;
    for (const topic of weakTopics) {
      if (await page.getByText(topic).first().isVisible().catch(() => false)) {
        foundAny = true;
        break;
      }
    }
    expect(foundAny).toBe(true);
  });

  test('failed screen has a return-to-learning action', async ({ page }) => {
    await page.goto('/learning/barrier');
    await page.waitForLoadState('domcontentloaded');

    await failRecall(page);
    await failConnect(page);
    await failApply(page);
    await failDefend(page);

    await expect(page.getByText('— Испытание не пройдено —')).toBeVisible({
      timeout: 15_000,
    });

    // Primary action label on failed branch (from page.tsx): "Вернуться к повторению".
    const returnBtn = page.getByRole('button', { name: 'Вернуться к повторению' });
    await expect(returnBtn).toBeVisible({ timeout: 5000 });

    await returnBtn.click();
    await page.waitForURL('**/learning');
  });
});
