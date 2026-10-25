import {
  localBrowser,
  Stagehand,
  type Page,
  type StagehandBrowser,
} from '@browserbasehq/stagehand';
import { test, type TestInfo } from '@playwright/test';
import type { Credentials } from '@e2e/support/env';
import { WEB_URL } from '@e2e/support/env';
import { waitForAuthSlot, waitForModelSlot } from '@e2e/support/throttle';

// Flash-Lite: the free tier gives it 500 requests a day, and Flash only 20,
// fewer than one run of this suite.
export const MODEL = (process.env.STAGEHAND_MODEL ??
  'google/gemini-3.5-flash-lite') as `google/${string}`;
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

export interface Sesion {
  browser: StagehandBrowser;
  stagehand: Stagehand;
  page: Page;
}

/** Without a model key the suite has nothing to run: it is skipped, not failed. */
export function requireModelKey(): void {
  test.skip(!API_KEY, 'GOOGLE_GENERATIVE_AI_API_KEY is not set');
}

/** Stagehand drives its own Chrome through its extension, not Playwright's browser. */
export async function abrir(): Promise<Sesion> {
  const browser = await localBrowser.launch({
    // Jenkins has no Google Chrome: it points this at Playwright's Chromium.
    executablePath: process.env.CHROME_PATH || undefined,
    headless: !process.env.HEADED,
    locale: 'es-CO',
    viewport: { width: 1280, height: 900 },
  });
  const stagehand = await Stagehand.create({
    browser,
    model: { modelName: MODEL, apiKey: API_KEY },
    logging: { level: 'warn' },
  });
  const [page] = await browser.context.pages();
  return { browser, stagehand: paced(stagehand), page: page! };
}

function paced(stagehand: Stagehand): Stagehand {
  const wait = <T extends (...args: never[]) => Promise<unknown>>(call: T): T =>
    (async (...args: Parameters<T>) => {
      await waitForModelSlot();
      return call(...args);
    }) as T;
  stagehand.act = wait(stagehand.act.bind(stagehand));
  stagehand.observe = wait(stagehand.observe.bind(stagehand));
  stagehand.extract = wait(stagehand.extract.bind(stagehand));
  return stagehand;
}

/** The tokens and inference time each test spent, attached to its report. */
export async function cerrar(sesion: Sesion | undefined, info: TestInfo): Promise<void> {
  if (!sesion) return;
  await info.attach('metricas-stagehand.json', {
    body: JSON.stringify(await sesion.stagehand.metrics(), null, 2),
    contentType: 'application/json',
  });
  await sesion.stagehand.close();
  await sesion.browser.close();
}

/**
 * Every full load renews the session through /auth/refresh, which the API
 * limits: the load waits for its slot. Then it waits for hydration, because
 * text typed into the prerendered inputs is wiped when React takes over.
 */
export async function cargar(page: Page, ruta: string): Promise<void> {
  await waitForAuthSlot('/api/v1/auth/refresh');
  await page.goto(`${WEB_URL}${ruta}`);
  await page.waitForFunction(() =>
    Boolean((window as unknown as { next?: { router?: unknown } }).next?.router),
  );
}

export async function esperarRuta(page: Page, ruta: string): Promise<void> {
  await page.waitForFunction((esperada) => location.pathname === esperada, ruta, {
    timeout: 90_000,
  });
}

export const rutaActual = async (page: Page) => new URL(await page.url()).pathname;

/**
 * The sign-in without the model: the credentials are typed by selector, so
 * they never reach an AI call.
 */
export async function iniciarSesion(page: Page, { email, password }: Credentials): Promise<void> {
  await cargar(page, '/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await waitForAuthSlot('/api/v1/auth/login');
  await page.locator('form button[type="submit"]').click();
  await esperarRuta(page, '/dashboard');
}
