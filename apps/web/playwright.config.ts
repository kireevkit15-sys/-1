import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Snapshot path includes platform so baselines generated on Windows (-win32)
  // won't conflict with CI Linux baselines (-linux). Rule: ALWAYS regenerate
  // baselines on CI before merging visual snapshot updates:
  //   npx playwright test --update-snapshots tests/visual/
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}',
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Mobile project intentionally excluded from visual snapshot tests
      // (run separately with --project="Mobile Chrome" to avoid snapshot
      // path collisions and flakiness on CI).
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: ['**/visual/**'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
