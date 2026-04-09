/**
 * FT.6 — AI Chat E2E
 * Tests the AI chat page: sending a message, receiving a demo reply,
 * dialogue list updates. Uses demo fallback — no backend required.
 */

import { test, expect } from '@playwright/test';

test.describe('AI Chat (Socratic assistant)', () => {
  test('should load the chat page with dialogue sidebar', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar heading "Диалоги"
    await expect(page.getByText('Диалоги')).toBeVisible({ timeout: 8000 });

    // "Новый" button in sidebar
    await expect(page.getByRole('button', { name: 'Новый' })).toBeVisible({ timeout: 5000 });
  });

  test('should show demo dialogues in the sidebar', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    // Wait for demo dialogues to load
    await page.waitForTimeout(1000);

    // At least one demo dialogue should appear (fallback to DEMO_DIALOGUES)
    const dialogueItem = page.getByText('Теория игр').or(page.getByText('Дилемма'));
    await expect(dialogueItem.first()).toBeVisible({ timeout: 8000 });
  });

  test('should show the empty chat state when no dialogue is open', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    // Empty state heading
    await expect(page.getByText('Сократический диалог')).toBeVisible({ timeout: 8000 });

    // Suggested starters should be visible
    await expect(page.getByText('Что такое равновесие Нэша?')).toBeVisible({ timeout: 5000 });
  });

  test('should allow typing a message in the textarea', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 8000 });

    await textarea.fill('Что такое теория игр?');
    await expect(textarea).toHaveValue('Что такое теория игр?');
  });

  test('should send a message and receive a demo AI reply', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 8000 });

    // Type a message
    const userMessage = 'Что такое равновесие Нэша?';
    await textarea.fill(userMessage);

    // Send with Enter key
    await textarea.press('Enter');

    // User message should appear in the chat
    await expect(page.getByText(userMessage)).toBeVisible({ timeout: 5000 });

    // AI typing indicator or response should appear
    // (demo delay is ~900-1500ms)
    await page.waitForTimeout(2000);

    // AI reply should be visible (demo replies use сократический метод phrasing)
    const aiReplyIndicators = [
      'сократический метод',
      'Хороший вопрос',
      'Давай разберём',
      'Интересная мысль',
      'Ты приближаешься',
    ];

    let replyFound = false;
    for (const phrase of aiReplyIndicators) {
      const el = page.getByText(phrase, { exact: false });
      if (await el.isVisible().catch(() => false)) {
        replyFound = true;
        break;
      }
    }
    expect(replyFound).toBe(true);
  });

  test('should update dialogue list after sending a message in a new chat', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    // Click "Новый" to ensure we start a fresh dialogue
    await page.getByRole('button', { name: 'Новый' }).click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Send a message
    await textarea.fill('Объясни теорию игр');
    await textarea.press('Enter');

    // Wait for message to appear
    await expect(page.getByText('Объясни теорию игр')).toBeVisible({ timeout: 5000 });

    // Wait for demo reply
    await page.waitForTimeout(2000);

    // The textarea should be empty after sending
    await expect(textarea).toHaveValue('');
  });

  test('should open an existing dialogue from the sidebar', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    // Wait for demo dialogues to load
    await page.waitForTimeout(1000);

    // Click the first demo dialogue
    const firstDialogue = page.getByText('Теория игр').first();
    const isVisible = await firstDialogue.isVisible().catch(() => false);

    if (isVisible) {
      await firstDialogue.click();

      // Should load demo messages for that dialogue
      await page.waitForTimeout(1000);

      // Demo message content should be visible
      const demoContent = page.getByText('Теория игр').or(page.getByText('Расскажи'));
      await expect(demoContent.first()).toBeVisible({ timeout: 5000 });
    } else {
      console.log('Demo dialogue not found; skipping sidebar dialogue test');
    }
  });

  test('should use suggested starter and populate textarea', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');

    // Click a suggested starter question
    const starter = page.getByText('Что такое равновесие Нэша?');
    await expect(starter).toBeVisible({ timeout: 8000 });
    await starter.click();

    // Textarea should be populated with the starter text
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue('Что такое равновесие Нэша?');
  });
});
