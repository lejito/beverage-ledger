import { expect, test, type Page } from '@playwright/test';
import { findRowOnAnyPage, messages, navigateInApp, newSignedInPage } from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';

const textos = messages.admin.users;

/** RF-29 de punta a punta sin cambiar a nadie: cada acción se cancela. */
test.describe.serial('RF-29 - Gestión de usuarios', () => {
  const { admin, operator } = e2eEnv();
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await newSignedInPage(browser, admin);
    await navigateInApp(page, '/admin/users');
  });

  test('Caso 1 - la fila propia se marca y no ofrece suspender', async () => {
    const propia = await findRowOnAnyPage(page, admin.email);

    await expect(propia.getByText(textos.you)).toBeVisible();
    await expect(propia.getByRole('button', { name: textos.suspend })).toHaveCount(0);
  });

  test('Caso 2 - suspender a otro miembro pide confirmación y cancelar no cambia su estado', async () => {
    const fila = await findRowOnAnyPage(page, operator.email);
    await fila.getByRole('button', { name: textos.suspend }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByText(textos.suspendDescription)).toBeVisible();
    await dialogo.getByRole('button', { name: messages.common.actions.cancel }).click();

    await expect(fila.getByText(messages.admin.statuses.ACTIVE)).toBeVisible();
  });
});
