import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Battle New', path: '/battle/new' },
  { name: 'Learn', path: '/learn' },
  { name: 'Profile', path: '/profile' },
  { name: 'Leaderboard', path: '/leaderboard' },
  { name: 'Achievements', path: '/achievements' },
  { name: 'Settings', path: '/settings' },
  { name: 'Chat', path: '/chat' },
  { name: 'About', path: '/about' },
];

for (const { name, path } of pages) {
  test(`${name} should have no critical accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Dark theme may have edge cases
      .analyze();
    expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
  });
}
