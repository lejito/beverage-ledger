import { expect, test } from '@playwright/test';
import { z } from 'zod';
import messages from '@/i18n/messages/es.json' with { type: 'json' };
import { e2eEnv } from '@e2e/support/env';
import { waitForAuthSlot } from '@e2e/support/throttle';
import {
  abrir,
  cargar,
  cerrar,
  esperarRuta,
  requireModelKey,
  rutaActual,
  type Sesion,
} from '@e2e/stagehand/support/stagehand.mjs';

/**
 * RF-01 con Stagehand: observe() encuentra los campos y devuelve selectores
 * reales, así que las credenciales se escriben sin pasar por el modelo; act()
 * pulsa el botón descrito en lenguaje natural, y extract() lee la pantalla con
 * un esquema de Zod. El veredicto lo dan siempre las aserciones exactas.
 */
test.describe('Stagehand · RF-01 - Inicio de sesión', () => {
  let sesion: Sesion | undefined;

  test.beforeEach(async () => {
    requireModelKey();
    sesion = await abrir();
  });

  test.afterEach(async ({}, info) => {
    await cerrar(sesion, info);
    sesion = undefined;
  });

  test('observe() identifica el formulario de acceso y sus acciones', async () => {
    const { stagehand, page } = sesion!;
    await cargar(page, '/login');

    const { data: acciones } = await stagehand.observe(
      'find the email field, the password field and the button that signs in',
    );

    expect(acciones.length).toBeGreaterThanOrEqual(3);
    for (const { selector } of acciones) {
      expect(await page.locator(selector).isVisible()).toBe(true);
    }
    const descripciones = acciones.map(({ description }) => description.toLowerCase()).join(' ');
    expect(descripciones).toMatch(/email|correo/);
    expect(descripciones).toMatch(/password|contraseña/);
  });

  test('act() envía credenciales inexistentes y extract() lee el rechazo', async () => {
    const { stagehand, page } = sesion!;
    await cargar(page, '/login');
    const [correo] = (await stagehand.observe('find the email input')).data;
    const [clave] = (await stagehand.observe('find the password input')).data;
    await page.locator(correo!.selector).fill('nadie+stagehand@beverageledger.test');
    await page.locator(clave!.selector).fill('NoExiste-2026');

    await waitForAuthSlot('/api/v1/auth/login');
    const envio = await stagehand.act(`click the "${messages.auth.signIn.submit}" button`);
    expect(envio.data.success).toBe(true);

    await page.waitForSelector('form [role="alert"]', { timeout: 90_000 });
    const { data } = await stagehand.extract(
      'extract the error message shown in the sign-in form',
      z.object({ mensaje: z.string() }),
    );
    expect(data.mensaje).toContain('Invalid email or password');
    expect(await rutaActual(page)).toBe('/login');
  });

  test('un operador entra y extract() confirma que su menú no tiene administración', async () => {
    const { stagehand, page } = sesion!;
    const { operator } = e2eEnv();
    await cargar(page, '/login');
    const [correo] = (await stagehand.observe('find the email input')).data;
    const [clave] = (await stagehand.observe('find the password input')).data;
    await page.locator(correo!.selector).fill(operator.email);
    await page.locator(clave!.selector).fill(operator.password);

    await waitForAuthSlot('/api/v1/auth/login');
    await stagehand.act(`click the "${messages.auth.signIn.submit}" button`);
    await esperarRuta(page, '/dashboard');

    const { data } = await stagehand.extract(
      'extract the visible labels of every link in the main navigation menu',
      z.object({ enlaces: z.array(z.string()) }),
    );
    expect(data.enlaces).toContain(messages.nav.items.dashboard);
    expect(data.enlaces).not.toContain(messages.nav.items.admin);
  });
});
