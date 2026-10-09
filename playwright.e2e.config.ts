import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';
import { WEB_URL } from './e2e/support/env';

// The same .env the app reads, so a local run finds NEXT_PUBLIC_API_URL and the
// CI accounts; a variable Jenkins already set wins.
process.env = { ...loadEnv('test', process.cwd(), ''), ...process.env };

/**
 * End-to-end: the compiled app (`pnpm build` first) served by `next start`,
 * talking to the API deployed on Render. One worker, because every suite shares
 * the API's login rate limit.
 */
export default defineConfig({
  testDir: 'e2e/flujos',
  testMatch: '*.e2e.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['junit', { outputFile: 'reports/e2e.xml' }],
    ['html', { outputFolder: 'reports/e2e', open: 'never' }],
  ],
  use: {
    baseURL: WEB_URL,
    locale: 'es-CO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm start',
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
