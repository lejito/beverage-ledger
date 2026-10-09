import { expect, test, type Page } from '@playwright/test';
import { messages, newSignedInPage } from '@e2e/support/browser';
import { CI_PRODUCT_NAME, e2eEnv } from '@e2e/support/env';

const textos = messages.catalog;

/** RF-09 de punta a punta sobre el producto fijo de CI, que se deja como estaba. */
test.describe.serial('RF-09 - Gestión de productos', () => {
  let page: Page;
  const fila = () => page.getByRole('row').filter({ hasText: CI_PRODUCT_NAME });

  test.beforeAll(async ({ browser }) => {
    page = await newSignedInPage(browser, e2eEnv().admin);
    await page.goto('/catalog');
  });

  test('Caso 1 - la búsqueda encuentra el producto por su nombre', async () => {
    await page.getByLabel(textos.filters.searchLabel).fill(CI_PRODUCT_NAME);

    await expect(fila()).toHaveCount(1);
  });

  test('Caso 2 - desactivar pide confirmación, y cancelar lo deja activo', async () => {
    await fila().getByRole('button', { name: textos.deactivate }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText(`¿Desactivar ${CI_PRODUCT_NAME}?`)).toBeVisible();
    await dialogo.getByRole('button', { name: messages.common.actions.cancel }).click();

    await expect(fila().getByText(textos.active)).toBeVisible();
  });

  test('Caso 3 - editar la existencia mínima se guarda, se anuncia y se puede restaurar', async () => {
    const editar = async (valor: string) => {
      await fila().getByRole('button', { name: messages.common.actions.edit }).click();
      const dialogo = page.getByRole('dialog');
      const campo = dialogo.getByLabel(textos.form.minimumStock);
      const anterior = await campo.inputValue();
      await campo.fill(valor);
      await dialogo.getByRole('button', { name: messages.common.actions.save }).click();
      await expect(page.getByText(textos.form.updatedTitle).first()).toBeVisible();
      return anterior;
    };

    const original = await editar('7');
    await expect(fila()).toContainText('7');

    await editar(original);
  });

  // Pendiente · heurística 36: la búsqueda filtra por subcadena y no tolera
  // errores tipográficos. Se activa junto con la prueba de API del mismo nombre.
  test.fixme('Pendiente heurística 36 - un error tipográfico encuentra el producto', async () => {
    await page.getByLabel(textos.filters.searchLabel).fill('[CI] Prodcto de prueba');

    await expect(fila()).toHaveCount(1);
  });
});
