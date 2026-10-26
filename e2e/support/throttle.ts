import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import type { BrowserContext } from '@playwright/test';

/**
 * The deployed API allows 10 calls a minute per route and client on login,
 * refresh and the public invitation routes, and every full page load of the app
 * renews the session through /auth/refresh. Requests to those routes wait for a
 * slot here, one under the limit, so a suite never fails on a 429 it caused.
 * Same budget and keys as the API repository's suites: AUTH_BUDGET_FILE points
 * both at one file when a CI runs them at once, since the API counts both
 * against the same limit.
 */
const THROTTLED = /\/api\/v1\/(auth\/(login|refresh)|invitations\/(lookup|accept))$/;
const BUDGET = 9;
const WINDOW_MS = 62_000;
const BUDGET_FILE =
  process.env.AUTH_BUDGET_FILE ||
  join(process.cwd(), 'node_modules', '.cache', 'beverage-ledger', 'auth-throttle.json');

type Budget = Record<string, number[]>;

function read(): Budget {
  try {
    return JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) as Budget;
  } catch {
    return {};
  }
}

function write(budget: Budget): void {
  mkdirSync(dirname(BUDGET_FILE), { recursive: true });
  writeFileSync(BUDGET_FILE, JSON.stringify(budget));
}

/**
 * Gemini's free tier allows 15 generate calls a minute, and Stagehand retries a
 * rejected call at once rather than when the quota says to. An act() may spend
 * two calls, so six operations a minute stays under the limit.
 */
const MODEL_BUDGET = 6;

/** For calls that do not go through a browser, such as Screenplay's CallAnApi. */
export async function waitForAuthSlot(route: string): Promise<void> {
  return takeSlot(route);
}

/** Before every Stagehand act(), observe() or extract(). */
export async function waitForModelSlot(): Promise<void> {
  return takeSlot('gemini', MODEL_BUDGET);
}

async function takeSlot(route: string, limit = BUDGET): Promise<void> {
  for (;;) {
    const now = Date.now();
    const budget = read();
    const recent = (budget[route] ?? []).filter((at) => now - at < WINDOW_MS);
    if (recent.length < limit) {
      budget[route] = [...recent, now];
      write(budget);
      return;
    }
    await sleep(WINDOW_MS - (now - recent[0]!) + 250);
  }
}

const throttled = new WeakSet<BrowserContext>();

/** Makes every throttled API call from this browser context wait for its slot. */
export async function respectAuthThrottle(context: BrowserContext): Promise<void> {
  if (throttled.has(context)) return;
  throttled.add(context);

  await context.route(THROTTLED, async (route) => {
    const request = route.request();
    // Preflights are not counted by the API's throttler.
    if (request.method() !== 'OPTIONS') await takeSlot(new URL(request.url()).pathname);
    await route.continue();
  });
}
