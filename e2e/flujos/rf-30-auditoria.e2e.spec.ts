import { expect, test, type Page } from '@playwright/test';
import { messages, navigateInApp, newSignedInPage } from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';

const textos = messages.admin.audit;

/**
 * RF-30 de punta a punta. Corre después de RF-09 (Playwright ordena por nombre),
 * cuya edición del producto de CI tiene que aparecer aquí.
 */
test.describe.serial('RF-30 - Log de auditoría', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await newSignedInPage(browser, e2eEnv().admin);
    await navigateInApp(page, '/admin/audit');
  });

  test('Caso 1 - el log muestra quién, qué y cuándo', async () => {
    await expect(page.getByRole('heading', { name: textos.title })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: textos.columns.who })).toBeVisible();
    await expect(page.getByRole('row').nth(1)).toBeVisible();
  });

  test('Caso 2 - filtrar por productos muestra la edición del producto de CI', async () => {
    await page.getByRole('combobox', { name: textos.entityLabel }).click();
    await page.getByRole('option', { name: textos.entities.product }).click();

    await expect(page.getByText(textos.actionNames.product.updated).first()).toBeVisible();
  });
});
