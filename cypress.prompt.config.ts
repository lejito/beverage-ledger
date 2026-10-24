import { defineConfig } from 'cypress';
import base from './cypress.config';

/**
 * The cy.prompt specs: the steps are natural language that Cypress Cloud turns
 * into commands, so they need CYPRESS_PROJECT_ID and a record key, and only run
 * on Chromium browsers. The assertions after each prompt stay in code.
 */
export default defineConfig({
  ...base,
  reporterOptions: { ...base.reporterOptions, reportDir: 'reports/cypress-prompt' },
  screenshotsFolder: 'reports/cypress-prompt/screenshots',
  videosFolder: 'reports/cypress-prompt/videos',
  e2e: {
    ...base.e2e,
    specPattern: 'cypress/e2e/ia/**/*.cy.ts',
    excludeSpecPattern: [],
  },
});
