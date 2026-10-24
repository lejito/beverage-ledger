import { defineConfig } from 'cypress';
import { loadEnv } from 'vite';
import { waitForAuthSlot } from './e2e/support/throttle';
import { WEB_URL } from './e2e/support/env';

// Same as the Playwright configs: .env for local runs, the environment wins.
process.env = { ...loadEnv('test', process.cwd(), ''), ...process.env };

const CREDENTIALS = [
  'CI_ADMIN_EMAIL',
  'CI_ADMIN_PASSWORD',
  'CI_MANAGER_EMAIL',
  'CI_MANAGER_PASSWORD',
  'CI_OPERATOR_EMAIL',
  'CI_OPERATOR_PASSWORD',
] as const;

/**
 * Cypress against the compiled app (`pnpm build` and `pnpm start` first) and the
 * API in NEXT_PUBLIC_API_URL. `ia/` holds the cy.prompt specs, which need Cypress
 * Cloud and run apart with cypress.prompt.config.ts, in the AI workflow.
 */
export default defineConfig({
  projectId: process.env.CYPRESS_PROJECT_ID || undefined,
  // The credentials stay secret: cy.env() reads them, the browser bundle never does.
  env: Object.fromEntries(CREDENTIALS.map((name) => [name, process.env[name] ?? ''])),
  expose: {
    apiUrl: `${(process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '')}/api/v1`,
  },
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'reports/cypress',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    reportPageTitle: 'Beverage Ledger - Cypress',
  },
  screenshotsFolder: 'reports/cypress/screenshots',
  videosFolder: 'reports/cypress/videos',
  video: true,
  viewportWidth: 1280,
  viewportHeight: 900,
  defaultCommandTimeout: 15_000,
  // A slot in the API's sign-in limit may take a minute to free up.
  taskTimeout: 90_000,
  retries: 0,
  e2e: {
    baseUrl: WEB_URL,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    excludeSpecPattern: ['cypress/e2e/ia/**'],
    async setupNodeEvents(on) {
      // The reporter's plugin ships without types.
      const plugin: string = 'cypress-mochawesome-reporter/plugin';
      const { default: mochawesome } = (await import(plugin)) as {
        default: (on: Cypress.PluginEvents) => void;
      };
      mochawesome(on);

      on('task', {
        log: (lines: string[]) => {
          lines.forEach((line) => console.log(line));
          return null;
        },
        // The same budget file the Playwright suites share (e2e/support/throttle.ts).
        authSlots: async (routes: string[]) => {
          for (const route of routes) await waitForAuthSlot(route);
          return null;
        },
      });
    },
  },
});
