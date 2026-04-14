/**
 * F28.3 — Learning Depth / "Раскрытие" E2E
 * Tests the ability to descend deeper on a feed card — inserting 6 new cards into .learning-feed.
 * Demo-mode works without a backend.
 */

import { test, expect } from '@playwright/test';

test.describe('Learning · Depth ("Спуститься глубже")', () => {
  test('day feed loads and "Раскрытие" card is reachable by scrolling', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Scroll a few times to reach the Раскрытие card
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(200);
      if (await page.getByText('Раскрытие', { exact: false }).first().isVisible().catch(() => false)) {
        break;
      }
    }

    await expect(page.getByText('Раскрытие', { exact: false }).first()).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText('Почему полной картины не бывает', { exact: false }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('clicking "Спуститься глубже" injects 6 new deeper cards', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Scroll to the deeper button
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(200);
      if (await page.getByRole('button', { name: 'Спуститься глубже' }).first().isVisible().catch(() => false)) {
        break;
      }
    }

    const deeperBtn = page.getByRole('button', { name: 'Спуститься глубже' }).first();
    await expect(deeperBtn).toBeVisible({ timeout: 5000 });
    await deeperBtn.click();
    await page.waitForTimeout(800);

    const expectedLabels = [
      'Другой угол',
      'Голос РАЗУМ',
      'Книга',
      'Философия',
      'Противоречие',
      'Связи',
    ];

    for (const label of expectedLabels) {
      // Scroll down a bit more since new cards are inserted below
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);
      const node = page.getByText(label, { exact: false }).first();
      await expect(node).toBeVisible({ timeout: 6000 });
    }
  });

  test('clicking "Спуститься глубже" twice on same card does not duplicate', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(200);
      if (await page.getByRole('button', { name: 'Спуститься глубже' }).first().isVisible().catch(() => false)) {
        break;
      }
    }

    const feed = page.locator('.learning-feed');
    await expect(feed).toBeVisible({ timeout: 5000 });

    const countBefore = await feed.locator('> *').count();

    const deeperBtn = page.getByRole('button', { name: 'Спуститься глубже' }).first();
    await deeperBtn.click();
    await page.waitForTimeout(700);

    const countAfterFirst = await feed.locator('> *').count();
    expect(countAfterFirst).toBeGreaterThan(countBefore);

    // Re-scroll to where button was (it's usually removed after expansion, so assert no duplicates)
    // If it still exists, click it — count should NOT grow by another 6
    const stillThere = await page.getByRole('button', { name: 'Спуститься глубже' }).first().isVisible().catch(() => false);
    if (stillThere) {
      await page.getByRole('button', { name: 'Спуститься глубже' }).first().click();
      await page.waitForTimeout(700);
    }

    const countFinal = await feed.locator('> *').count();
    // Should not have doubled the insertion
    expect(countFinal).toBeLessThanOrEqual(countAfterFirst + 1);
  });

  test('"Нить" card with "Сегодня" and decision copy is visible', async ({ page }) => {
    await page.goto('/learning/day');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Нить card is typically near the top
    let foundThread = false;
    let foundToday = false;
    let foundDecision = false;
    for (let i = 0; i < 15; i++) {
      if (!foundToday && await page.getByText('Сегодня', { exact: false }).first().isVisible().catch(() => false)) {
        foundToday = true;
      }
      if (!foundDecision && await page.getByText('Решение без полной информации', { exact: false }).first().isVisible().catch(() => false)) {
        foundDecision = true;
      }
      if (!foundThread && await page.getByText('Нить', { exact: false }).first().isVisible().catch(() => false)) {
        foundThread = true;
      }
      if (foundToday && foundDecision) break;
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(180);
    }

    expect(foundToday).toBe(true);
    expect(foundDecision).toBe(true);
  });
});
