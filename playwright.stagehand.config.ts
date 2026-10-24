import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';
import { WEB_URL } from './e2e/support/env';

// Same as playwright.e2e.config.ts: .env for local runs, the environment wins.
process.env = { ...loadEnv('test', process.cwd(), ''), ...process.env };

/**
 * Stagehand on the compiled app and the API in NEXT_PUBLIC_API_URL. Playwright
 * Test only runs the specs, serves the app and writes the reports: Stagehand
 * launches its own Chrome. Every act, observe and extract calls the model in
 * STAGEHAND_MODEL with GOOGLE_GENERATIVE_AI_API_KEY; without the key the specs
 * are skipped.
 */
export default defineConfig({
  testDir: 'e2e/stagehand',
  testMatch: '*.stagehand.spec.mts',
  workers: 1,
  fullyParallel: false,
  // Model answers vary between runs; one retry tells a flaky inference from a defect.
  retries: process.env.CI ? 1 : 0,
  timeout: 240_000,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/stagehand.xml' }],
    ['html', { outputFolder: 'reports/stagehand', open: 'never' }],
  ],
  webServer: {
    command: 'pnpm start',
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
