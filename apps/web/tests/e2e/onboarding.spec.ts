/**
 * FT.3 — Onboarding E2E
 * Tests the full onboarding flow:
 * info slides → branch selection → final screen → redirect
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear onboarding state so we always start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('razum_onboarding_done');
      localStorage.removeItem('razum_favorite_branches');
    });
  });

  test('should display the first onboarding info slide', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // First info slide
    await expect(page.getByText('Добро пожаловать в РАЗУМ')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Далее' })).toBeVisible();
    // Skip button should be present
    await expect(page.getByText('Пропустить')).toBeVisible();
  });

  test('should step through all info slides', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Welcome slide
    await expect(page.getByText('Добро пожаловать в РАЗУМ')).toBeVisible();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 2: Battles slide
    await expect(page.getByText('Интеллект-баттлы')).toBeVisible();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 3: Knowledge tree slide
    await expect(page.getByText('Дерево знаний')).toBeVisible();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 4: Avatar slide
    await expect(page.getByText('Твой аватар')).toBeVisible();
    await page.getByRole('button', { name: 'Далее' }).click();

    // Step 5: Branch selection
    await expect(page.getByText('Выбери 3 направления')).toBeVisible();
  });

  test('should allow selecting exactly 3 branches', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Skip past info slides quickly
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Далее' }).click();
      await page.waitForTimeout(150);
    }

    // Should be on branch selection step
    await expect(page.getByText('Выбери 3 направления')).toBeVisible();

    // Counter starts at 0
    await expect(page.getByText('Выбрано: 0/3')).toBeVisible();

    // Select Стратегия
    await page.getByText('Стратегия').first().click();
    await expect(page.getByText('Выбрано: 1/3')).toBeVisible();

    // Select Логика
    await page.getByText('Логика').first().click();
    await expect(page.getByText('Выбрано: 2/3')).toBeVisible();

    // Select Эрудиция
    await page.getByText('Эрудиция').first().click();
    await expect(page.getByText('Выбрано: 3/3')).toBeVisible();

    // 4th click should be blocked (max 3)
    await page.getByText('Риторика').first().click();
    await expect(page.getByText('Выбрано: 3/3')).toBeVisible();

    // Continue button should now be enabled
    await expect(page.getByRole('button', { name: 'Далее' })).toBeEnabled();
  });

  test('should proceed to final step after selecting 3 branches', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Advance through info slides
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Далее' }).click();
      await page.waitForTimeout(150);
    }

    // Select 3 branches
    await page.getByText('Стратегия').first().click();
    await page.getByText('Логика').first().click();
    await page.getByText('Эрудиция').first().click();

    // Proceed to final step
    await page.getByRole('button', { name: 'Далее' }).click();

    // Final screen
    await expect(page.getByText('Всё готово')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Начать первый баттл' })).toBeVisible();
  });

  test('should redirect to /battle/new when "Начать первый баттл" is clicked', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Advance through info slides
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Далее' }).click();
      await page.waitForTimeout(150);
    }

    // Select 3 branches
    await page.getByText('Стратегия').first().click();
    await page.getByText('Логика').first().click();
    await page.getByText('Эрудиция').first().click();

    // Go to final step
    await page.getByRole('button', { name: 'Далее' }).click();

    // Click "Начать первый баттл"
    await page.getByRole('button', { name: 'Начать первый баттл' }).click();

    // Should redirect to /battle/new
    await page.waitForURL('**/battle/new**');
    expect(page.url()).toContain('/battle/new');
  });

  test('should skip onboarding and go to home', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    await page.getByText('Пропустить').click();

    // Should redirect to home
    await page.waitForURL('**/');
    await expect(page.getByText('РАЗУМ')).toBeVisible();
  });
});
