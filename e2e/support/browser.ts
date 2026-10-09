import AxeBuilder from '@axe-core/playwright';
import { expect, type Browser, type Page } from '@playwright/test';
import messages from '@/i18n/messages/es.json';
import type { Credentials } from './env';
import { WEB_URL } from './env';
import { respectAuthThrottle } from './throttle';

export { messages };

/** A fresh browser context, in Spanish, whose auth calls respect the API's limit. */
export async function newPage(
  browser: Browser,
  viewport = { width: 1280, height: 900 },
): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL, locale: 'es-CO', viewport });
  await respectAuthThrottle(context);
  return context.newPage();
}

export async function signIn(page: Page, { email, password }: Credentials): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(messages.auth.fields.email).fill(email);
  await page.getByLabel(messages.auth.fields.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: messages.auth.signIn.submit }).click();
  await page.waitForURL('**/dashboard');
}

export async function newSignedInPage(browser: Browser, credentials: Credentials): Promise<Page> {
  const page = await newPage(browser);
  await signIn(page, credentials);
  return page;
}

/**
 * Heuristics 49 to 52 (colour, contrast, legibility, reduced vision) as WCAG 2.1
 * AA, through axe. Only serious and critical violations fail: the rest are
 * reported by axe as advice, not as barriers.
 */
export async function expectAccessible(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const barriers = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    );

  expect(barriers, `Barreras de accesibilidad en ${page.url()}`).toEqual([]);
}
