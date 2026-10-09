import { expect, test, type Page } from '@playwright/test';
import {
  AFTER_THROTTLED_CALL,
  messages,
  navigateInApp,
  newPage,
  newSignedInPage,
} from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';

const textos = messages.admin.invitations;

/**
 * RF-03 de punta a punta sin crear a nadie: el administrador emite una
 * invitación, el invitado ve su vista previa y la invitación se cancela antes
 * de usarla. Aceptar una (que crea un miembro) es el escenario de Screenplay.
 */
test.describe.serial('RF-03 - Invitaciones', () => {
  const email = `ci-e2e+${Date.now()}@beverageledger.test`;
  let admin: Page;
  let enlace: string;

  test.beforeAll(async ({ browser }) => {
    admin = await newSignedInPage(browser, e2eEnv().admin);
  });

  test('Caso 1 - emitir una invitación entrega un enlace de un solo uso', async () => {
    await navigateInApp(admin, '/admin/users');
    await admin.getByRole('button', { name: messages.admin.users.new }).first().click();

    const dialogo = admin.getByRole('dialog');
    await dialogo.getByLabel(textos.form.email).fill(email);
    await dialogo.getByRole('button', { name: textos.form.submit }).click();

    const campo = dialogo.getByLabel(textos.form.link);
    await expect(campo).toBeVisible();
    enlace = await campo.inputValue();
    expect(enlace).toMatch(/\/invite\/[\w-]+$/);
    await expect(dialogo.getByText(textos.form.linkHint)).toBeVisible();
  });

  test('Caso 2 - quien abre el enlace ve a qué organización y con qué correo entra', async ({
    browser,
  }) => {
    const invitado = await newPage(browser);
    await invitado.goto(new URL(enlace).pathname);

    await expect(invitado.getByText(email)).toBeVisible(AFTER_THROTTLED_CALL);
    await expect(invitado.getByText(messages.common.passwordPolicy)).toBeVisible();
  });

  test('Caso 3 - cancelar la invitación pide confirmación y deja el enlace inservible', async ({
    browser,
  }) => {
    await admin.keyboard.press('Escape');
    const fila = admin.getByRole('row').filter({ hasText: email });
    await fila.getByRole('button', { name: textos.revoke }).click();

    const confirmacion = admin.getByRole('dialog');
    await expect(confirmacion.getByText(textos.revokeDescription)).toBeVisible();
    await confirmacion.getByRole('button', { name: textos.revokeConfirm }).click();
    await expect(admin.getByText(textos.revoked).first()).toBeVisible();

    const invitado = await newPage(browser);
    await invitado.goto(new URL(enlace).pathname);
    await expect(invitado.getByText(messages.invite.invalidTitle)).toBeVisible(
      AFTER_THROTTLED_CALL,
    );
  });
});
