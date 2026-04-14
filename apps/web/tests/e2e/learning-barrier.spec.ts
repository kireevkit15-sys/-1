/**
 * F28.4 — Learning Barrier E2E (pass path)
 *
 * Flow: /learning/barrier → Recall (6 Qs, detailed answers) → Connect (3 pairs)
 *  → Apply (2 situations) → Defend (4 rounds, held) → Verdict: passed →
 *  secondary action "В бой".
 *
 * Passing thresholds (from apps/web/app/(main)/learning/barrier/page.tsx):
 *   recall   : ≥4 green (≥12 words per answer)
 *   connect  : ≥2 strong (≥18 words per answer)
 *   apply    : ≥1 applied (≥40 words per answer)
 *   defend   : outcome != "lost" (avg ≥10 words per user turn; ≥25 for "held")
 *
 * Page is fully demo-mode; no backend required.
 */

import { test, expect } from '@playwright/test';

// A long-enough answer to reliably pass all stage thresholds (≥40 words).
const LONG_ANSWER =
  'Здесь работает порог достаточности: нужно сравнить цену ошибки и цену промедления ' +
  'в конкретной ситуации, а не следовать универсальному правилу, потому что стратег ' +
  'ищет минимум фактов для движения, а не полноту картины, которая всегда будет ' +
  'недостижима, и именно это отличает решающего от аналитика в работе с неполнотой информации и с темпом.';

async function submitRecall(page: import('@playwright/test').Page) {
  // 6 questions. Each: fill textarea → click "Ответить" → wait for verdict → auto-advance (1200 ms).
  for (let i = 0; i < 6; i++) {
    const stage = page.locator('section[aria-label="Вспомни"]');
    await expect(stage).toBeVisible({ timeout: 8000 });
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(LONG_ANSWER);
    await stage.getByRole('button', { name: 'Ответить' }).click();
    // Verdict ("Верно" / "Почти" / "Не уловил") appears, then auto-advance after NEXT_DELAY_MS=1200ms.
    // After last question, onComplete fires → ConnectStage mounts.
    await page.waitForTimeout(1700);
  }
}

async function submitConnect(page: import('@playwright/test').Page) {
  // 3 pairs. Each: fill → "Ответить" → wait verdict → click "Дальше"/"Завершить".
  for (let i = 0; i < 3; i++) {
    const stage = page.locator('section[aria-label="Свяжи"]');
    await expect(stage).toBeVisible({ timeout: 8000 });
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(LONG_ANSWER);
    await stage.getByRole('button', { name: 'Ответить' }).click();

    const nextButton = stage
      .getByRole('button', { name: 'Дальше' })
      .or(stage.getByRole('button', { name: 'Завершить' }));
    await expect(nextButton.first()).toBeVisible({ timeout: 8000 });
    await nextButton.first().click();
  }
}

async function submitApply(page: import('@playwright/test').Page) {
  // 2 situations.
  for (let i = 0; i < 2; i++) {
    const stage = page.locator('section[aria-label="Примени"]');
    await expect(stage).toBeVisible({ timeout: 8000 });
    const textarea = stage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(LONG_ANSWER);
    await stage.getByRole('button', { name: 'Отправить' }).click();

    const nextButton = stage
      .getByRole('button', { name: 'Следующая' })
      .or(stage.getByRole('button', { name: 'Завершить' }));
    await expect(nextButton.first()).toBeVisible({ timeout: 8000 });
    await nextButton.first().click();
  }
}

async function submitDefend(page: import('@playwright/test').Page) {
  // maxRounds=4 → user sends 4 messages. Each cycle: wait for user-turn textarea
  // (mentor-thinking ~900ms), fill, click "Ответить".
  const stage = page.locator('section[aria-label="Защити"]');
  await expect(stage).toBeVisible({ timeout: 8000 });

  for (let i = 0; i < 4; i++) {
    const textarea = stage.locator('textarea');
    // Wait until textarea becomes enabled (phase === "user-turn").
    await expect(textarea).toBeEnabled({ timeout: 10000 });
    await textarea.fill(LONG_ANSWER);
    const sendBtn = stage.getByRole('button', { name: 'Ответить' });
    await expect(sendBtn).toBeEnabled({ timeout: 5000 });
    await sendBtn.click();
  }
  // After 4th send → finalize() → grading → onComplete → verdict phase.
}

test.describe('Learning — Barrier (pass path)', () => {
  // Multi-stage flow with AI grading stubs — give it air.
  test.setTimeout(120_000);

  test('page loads with challenge header and first stage (Recall)', async ({ page }) => {
    await page.goto('/learning/barrier');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('— Испытание —')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/Уровень\s+Наблюдатель/)).toBeVisible({ timeout: 5000 });

    // First stage — Recall — is shown immediately (no intro screen).
    const recall = page.locator('section[aria-label="Вспомни"]');
    await expect(recall).toBeVisible({ timeout: 8000 });
    await expect(recall.locator('textarea')).toBeVisible({ timeout: 5000 });
  });

  test('recall stage shows question prompt and progress 1 / 6', async ({ page }) => {
    await page.goto('/learning/barrier');
    await page.waitForLoadState('domcontentloaded');

    const recall = page.locator('section[aria-label="Вспомни"]');
    await expect(recall).toBeVisible({ timeout: 8000 });

    // First recall question from RECALL_QUESTIONS[0].
    await expect(
      recall.getByText(/порог достаточности/i),
    ).toBeVisible({ timeout: 5000 });

    await expect(recall.getByText(/1\s*\/\s*6/)).toBeVisible({ timeout: 5000 });
  });

  test('full pass flow: recall → connect → apply → defend → passed + "В бой"', async ({
    page,
  }) => {
    await page.goto('/learning/barrier');
    await page.waitForLoadState('domcontentloaded');

    await submitRecall(page);
    await submitConnect(page);
    await submitApply(page);
    await submitDefend(page);

    // Verdict screen — passed branch.
    await expect(page.getByText('— Испытание пройдено —')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('button', { name: 'Продолжить путь' }),
    ).toBeVisible({ timeout: 5000 });

    // Secondary action: "В бой" (battle unlock).
    await expect(
      page.getByRole('button', { name: 'В бой' }),
    ).toBeVisible({ timeout: 5000 });
  });
});
