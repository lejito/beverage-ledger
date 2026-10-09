import { defineConfig } from '@playwright/test';
import type { SerenityFixtures, SerenityWorkerFixtures } from '@serenity-js/playwright-test';
import { loadEnv } from 'vite';
import { WEB_URL } from './e2e/support/env';

// Same as playwright.e2e.config.ts: .env for local runs, the environment wins.
process.env = { ...loadEnv('test', process.cwd(), ''), ...process.env };

/**
 * Screenplay scenarios with Serenity/JS on Playwright Test, against the compiled
 * app and the deployed API. The Serenity BDD reporter writes its JSON to
 * target/site/serenity; `pnpm test:screenplay:report` turns it into the HTML
 * living documentation, which needs Java 17 or later.
 */
export default defineConfig<SerenityFixtures, SerenityWorkerFixtures>({
  testDir: 'e2e/screenplay',
  testMatch: '*.screenplay.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: [
    ['line'],
    ['junit', { outputFile: 'reports/screenplay.xml' }],
    [
      '@serenity-js/playwright-test',
      {
        crew: [
          '@serenity-js/console-reporter',
          ['@serenity-js/serenity-bdd', { specDirectory: './e2e/screenplay' }],
          ['@serenity-js/core:ArtifactArchiver', { outputDirectory: 'target/site/serenity' }],
        ],
      },
    ],
  ],
  use: {
    crew: [['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }]],
    defaultActorName: 'Ana',
    baseURL: WEB_URL,
    locale: 'es-CO',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm start',
    url: WEB_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
