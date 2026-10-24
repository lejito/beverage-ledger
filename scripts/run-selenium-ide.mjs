// Runs selenium/beverage-ledger.side with selenium-side-runner against the app
// on :3000. The project keeps {{CI_*}} placeholders instead of credentials, so
// the file can live in git; they are filled in from the environment (or .env)
// into a copy under reports/selenium, which is gitignored.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (existsSync('.env')) process.loadEnvFile('.env');

const OUTPUT = join('reports', 'selenium');
const source = readFileSync(join('selenium', 'beverage-ledger.side'), 'utf8');

const missing = new Set();
const project = source.replace(/\{\{(CI_[A-Z_]+)\}\}/g, (_, name) => {
  const value = process.env[name]?.trim();
  if (!value) missing.add(name);
  // JSON-escaped, since the value lands inside a JSON string.
  return JSON.stringify(value ?? '').slice(1, -1);
});
if (missing.size > 0) {
  console.error(`Selenium IDE needs these variables: ${[...missing].join(', ')}`);
  process.exit(1);
}

mkdirSync(join(OUTPUT, 'screenshots'), { recursive: true });
const runnable = join(OUTPUT, 'beverage-ledger.side');
writeFileSync(runnable, project);

const headless = process.env.HEADED ? '' : '--headless=new,';
// Jenkins has no Google Chrome: CHROME_PATH points at Playwright's Chromium, and
// Selenium Manager fetches the chromedriver that matches it.
const binary = process.env.CHROME_PATH
  ? ` goog:chromeOptions.binary=${process.env.CHROME_PATH}`
  : '';
const { status } = spawnSync(
  'selenium-side-runner',
  [
    '--base-url',
    'http://localhost:3000',
    '--capabilities',
    `browserName=chrome goog:chromeOptions.args=[${headless}--window-size=1280,900,--lang=es-CO]${binary}`,
    '--timeout',
    '30000',
    '--jest-timeout',
    '240000',
    '--max-workers',
    '1',
    '--output-directory',
    OUTPUT,
    '--screenshot-failure-directory',
    join(OUTPUT, 'screenshots'),
    runnable,
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(status ?? 1);
