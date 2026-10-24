import AxeBuilder from '@axe-core/playwright';
import { expect, type Browser, type Locator, type Page } from '@playwright/test';
import messages from '@/i18n/messages/es.json';
import type { Credentials } from './env';
import { WEB_URL } from './env';
import { respectAuthThrottle } from './throttle';

export { messages };

/**
 * For what appears only after a throttled call (login, refresh, invitation
 * lookup): the call may wait up to a minute for its slot in the API's limit.
 */
export const AFTER_THROTTLED_CALL = { timeout: 75_000 };

/** A fresh browser context, in Spanish, whose auth calls respect the API's limit. */
export async function newPage(
  browser: Browser,
  viewport = { width: 1280, height: 900 },
): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL, locale: 'es-CO', viewport });
  await respectAuthThrottle(context);
  return context.newPage();
}

interface NextWindow {
  next: { router: { push(path: string): void } };
}

/**
 * Next prerenders the page and React takes over the inputs a moment later: text
 * typed before that is wiped when the controlled inputs hydrate. The app router
 * appears on `window.next` once hydration is done.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Boolean((window as unknown as Partial<NextWindow>).next?.router),
  );
}

const goToPage = (page: number) =>
  messages.common.pagination.goToPage.replace('{page}', String(page));

/**
 * The row of a paginated table that mentions `text`, on whichever page it is.
 * The deployed database grows with every run, so nothing stays on page one.
 * @throws {Error} once the last page has gone by without it.
 */
export async function findRowOnAnyPage(page: Page, text: string): Promise<Locator> {
  const rows = page.getByRole('row');
  // The first one: a screen may hold several tables, such as members above invitations.
  const summary = page.getByRole('navigation', { name: messages.common.pagination.label }).first();
  // The control renders a desktop and a mobile set of buttons; only one is shown.
  const button = (name: string) => summary.getByRole('button', { name }).filter({ visible: true });
  await expect(rows.nth(1)).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  // Start from the first page: an earlier search may have left the table further on.
  if (await button(messages.common.pagination.previous).isEnabled()) {
    const before = await summary.innerText();
    await button(goToPage(1)).click();
    await expect(summary).not.toHaveText(before);
    // The previous page's rows stay on screen while the next one loads.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  }

  for (;;) {
    const row = rows.filter({ hasText: text });
    if ((await row.count()) > 0) return row;

    const next = button(messages.common.pagination.next);
    if (await next.isDisabled()) throw new Error(`«${text}» no aparece en ninguna página`);

    const before = await summary.innerText();
    await next.click();
    await expect(summary).not.toHaveText(before);
    // The previous page's rows stay on screen while the next one loads.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  }
}

/** The form's own alert: Next's route announcer also has role="alert", empty. */
export const formAlert = (page: Page) => page.locator('form').getByRole('alert');

export async function signIn(page: Page, { email, password }: Credentials): Promise<void> {
  await page.goto('/login');
  await waitForHydration(page);
  await page.getByLabel(messages.auth.fields.email).fill(email);
  await page.getByLabel(messages.auth.fields.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: messages.auth.signIn.submit }).click();
  await page.waitForURL('**/dashboard');
}

/**
 * Moves inside the app as a click on one of its links would, without reloading.
 * A full load renews the session through /auth/refresh, which the API limits to
 * ten a minute; `page.goto` stays for the cases that are about a fresh load.
 */
export async function navigateInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => (window as unknown as NextWindow).next.router.push(target), path);
  await page.waitForURL(`**${path}`);
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
  // Each view fades in: measured mid-animation, text is still translucent and
  // fails contrast it meets at rest. A screen with no data to wait for, such as
  // /profile, reaches axe while the fade is still running.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
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
