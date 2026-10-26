// Runs selenium/beverage-ledger.side with selenium-side-runner against the app
// on :3000. The project keeps {{CI_*}} placeholders instead of credentials, so
// the file can live in git; they are filled in from the environment (or .env)
// into a copy under reports/selenium, which is gitignored.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

// The recorded steps cannot wait for a login slot the way the other suites do
// (e2e/support/throttle.ts), and starting right after one of them answered 429.
// So it waits until the shared budget has been idle for a whole window, then
// claims all of it: its five sign-ins fit in what the API allows in a minute.
const BUDGET_FILE =
  process.env.AUTH_BUDGET_FILE ||
  join('node_modules', '.cache', 'beverage-ledger', 'auth-throttle.json');
const THROTTLED = ['/api/v1/auth/login', '/api/v1/auth/refresh'];
const WINDOW_MS = 62_000;
const BUDGET = 9;
for (;;) {
  let budget = {};
  try {
    budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
  } catch {
    // No budget file yet: nothing has signed in recently.
  }
  const now = Date.now();
  const last = Math.max(0, ...THROTTLED.flatMap((route) => budget[route] ?? []));
  if (now - last >= WINDOW_MS) {
    for (const route of THROTTLED) budget[route] = Array.from({ length: BUDGET }, () => now);
    mkdirSync(dirname(BUDGET_FILE), { recursive: true });
    writeFileSync(BUDGET_FILE, JSON.stringify(budget));
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, WINDOW_MS - (now - last) + 250));
}

const headless = process.env.HEADED ? '' : '--headless=new,';
// Jenkins has no Google Chrome: CHROME_PATH points at Playwright's Chromium, and
// Selenium Manager fetches the chromedriver that matches it. That Chromium runs
// inside the Jenkins container, where it cannot set up its sandbox and aborts:
// Playwright launches it with --no-sandbox for the same reason.
const binary = process.env.CHROME_PATH
  ? ` goog:chromeOptions.binary=${process.env.CHROME_PATH}`
  : '';
const containerArgs = process.env.CHROME_PATH ? '--no-sandbox,--disable-dev-shm-usage,' : '';
const { status } = spawnSync(
  'selenium-side-runner',
  [
    '--base-url',
    'http://localhost:3000',
    '--capabilities',
    `browserName=chrome goog:chromeOptions.args=[${headless}${containerArgs}--window-size=1280,900,--lang=es-CO]${binary}`,
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
