import { Interaction } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright, type PlaywrightPage } from '@serenity-js/playwright';
import { navigateInApp, waitForHydration } from '@e2e/support/browser';

/**
 * The actor follows a link inside the app instead of typing a URL. A full load
 * would renew the session through /auth/refresh, which the API limits to ten a
 * minute across every actor; Navigate.to stays for entry points such as /login
 * and the invitation link.
 */
export const IrA = (ruta: string) =>
  Interaction.where(`#actor va a ${ruta}`, async (actor) => {
    const page = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
    await navigateInApp(await page.nativePage(), ruta);
  });

/**
 * After a full load the actor waits for the page to be the app and not its
 * prerendered HTML: text typed into inputs before hydration is wiped.
 */
export const EsperarQueLaAppEsteLista = () =>
  Interaction.where('#actor espera a que la aplicación termine de cargar', async (actor) => {
    const page = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
    await waitForHydration(await page.nativePage());
  });
