import { expect, test } from '@playwright/test';
import { messages, newPage, signIn } from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';

const { operator } = e2eEnv();

/** RF-01 de punta a punta: el navegador, la app compilada y la API desplegada. */
test.describe('RF-01 - Inicio de sesión', () => {
  test('Caso 1 - credenciales que no existen se rechazan con un mensaje y sin entrar', async ({
    browser,
  }) => {
    const page = await newPage(browser);
    await page.goto('/login');

    await page.getByLabel(messages.auth.fields.email).fill('nadie+e2e@beverageledger.test');
    await page.getByLabel(messages.auth.fields.password, { exact: true }).fill('NoExiste-2026');
    await page.getByRole('button', { name: messages.auth.signIn.submit }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Caso 2 - un operador entra, no ve administración y al salir pierde el acceso', async ({
    browser,
  }) => {
    const page = await newPage(browser);

    await signIn(page, operator);
    await expect(
      page.getByRole('link', { name: messages.nav.items.dashboard }).first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: messages.nav.items.admin })).toHaveCount(0);

    await page
      .getByRole('button', { name: new RegExp(messages.nav.account.menu) })
      .first()
      .click();
    await page.getByRole('button', { name: messages.nav.account.signOut }).click();
    await page.waitForURL('**/login');

    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers/);
  });

  test('Caso 3 - un enlace profundo sin sesión vuelve a su destino después de entrar', async ({
    browser,
  }) => {
    const page = await newPage(browser);

    await page.goto('/catalog');
    await page.waitForURL(/\/login\?next=%2Fcatalog/);
    await page.getByLabel(messages.auth.fields.email).fill(operator.email);
    await page.getByLabel(messages.auth.fields.password, { exact: true }).fill(operator.password);
    await page.getByRole('button', { name: messages.auth.signIn.submit }).click();

    await page.waitForURL('**/catalog');
    await expect(page.getByRole('heading', { name: messages.catalog.title })).toBeVisible();
  });
});
