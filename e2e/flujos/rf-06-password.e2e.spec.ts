import { expect, test, type Page } from '@playwright/test';
import { messages, newSignedInPage } from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';

const textos = messages.profile.password;

/**
 * RF-06 de punta a punta sobre la cuenta fija de operador, sin cambiarla nunca:
 * cada intento se rechaza. El cambio real ocurre en el escenario de Screenplay,
 * sobre el miembro que crea la corrida.
 */
test.describe.serial('RF-06 - Cambio de contraseña', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await newSignedInPage(browser, e2eEnv().operator);
    await page.goto('/profile');
  });

  test('Caso 1 - la política y la advertencia de cierre de sesiones están a la vista', async () => {
    await expect(page.getByText(messages.common.passwordPolicy).first()).toBeVisible();
    await expect(page.getByText(textos.warning)).toBeVisible();
  });

  test('Caso 2 - una confirmación distinta se señala sin llamar a la API', async () => {
    await page.getByLabel(textos.current, { exact: true }).fill('Cualquiera-2026');
    await page.getByLabel(textos.new, { exact: true }).fill('Nueva-Segura-2026');
    await page.getByLabel(textos.repeat, { exact: true }).fill('Otra-Distinta-2026');
    await page.getByRole('button', { name: textos.submit }).click();

    await expect(page.getByText(messages.common.validation.mismatch)).toBeVisible();
  });

  test('Caso 3 - una contraseña actual incorrecta se rechaza y la sesión sigue abierta', async () => {
    await page.getByLabel(textos.repeat, { exact: true }).fill('Nueva-Segura-2026');
    await page.getByRole('button', { name: textos.submit }).click();

    await expect(page.getByText(textos.changeFailed)).toBeVisible();
    await expect(page).toHaveURL(/\/profile/);
  });
});
