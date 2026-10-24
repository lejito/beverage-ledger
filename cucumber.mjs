/**
 * Gherkin scenarios with Cucumber and Serenity/JS, on the Screenplay tasks of
 * e2e/screenplay. Like the Playwright suites they need the compiled app on :3000
 * (`pnpm build` and `pnpm start`) and the API in NEXT_PUBLIC_API_URL.
 */
const config = {
  paths: ['e2e/features/**/*.feature'],
  requireModule: ['tsx/cjs'],
  require: ['e2e/features/support/*.ts', 'e2e/features/step-definitions/*.ts'],
  format: ['@serenity-js/cucumber', 'junit:reports/gherkin.xml'],
  formatOptions: { specDirectory: 'e2e/features' },
  // One scenario at a time: every suite shares the API's login rate limit.
  parallel: 0,
  strict: true,
};

export default config;
