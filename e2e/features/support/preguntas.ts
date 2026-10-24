import { Question } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright, type PlaywrightPage } from '@serenity-js/playwright';
import type { Page } from '@playwright/test';

async function paginaDe(actor: Parameters<Parameters<typeof Question.about>[1]>[0]): Promise<Page> {
  const page = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
  return page.nativePage();
}

/**
 * Whether a person can read `texto` on screen. Hidden copies, such as the
 * mobile rows of a table, do not count.
 */
export const SeVeElTexto = (texto: string) =>
  Question.about(`si se ve el texto «${texto}»`, async (actor) => {
    const visibles = (await paginaDe(actor)).getByText(texto).filter({ visible: true });
    return (await visibles.count()) > 0;
  });

/** The text of each table row a person can see, without the header. */
export const FilasVisibles = () =>
  Question.about('las filas visibles de la tabla', async (actor) =>
    (await paginaDe(actor)).locator('tbody tr:visible').allInnerTexts(),
  );
