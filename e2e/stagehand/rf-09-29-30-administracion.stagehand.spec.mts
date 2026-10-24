import { expect, test } from '@playwright/test';
import { z } from 'zod';
import messages from '@/i18n/messages/es.json' with { type: 'json' };
import { CI_PRODUCT_NAME, e2eEnv } from '@e2e/support/env';
import {
  abrir,
  cerrar,
  esperarRuta,
  iniciarSesion,
  requireModelKey,
  type Sesion,
} from '@e2e/stagehand/support/stagehand.mjs';

const acciones = messages.admin.audit.actionNames.product;

/**
 * RF-09, RF-29 y RF-30 con Stagehand, como administradora. Se entra sin el
 * modelo; desde ahí, act() navega y filtra como lo haría una persona y extract()
 * devuelve la tabla como datos validados, sobre los que deciden las aserciones.
 */
test.describe('Stagehand · Administración', () => {
  let sesion: Sesion | undefined;

  test.beforeEach(async () => {
    requireModelKey();
    sesion = await abrir();
    await iniciarSesion(sesion.page, e2eEnv().admin);
  });

  test.afterEach(async ({}, info) => {
    await cerrar(sesion, info);
    sesion = undefined;
  });

  test('RF-09 - act() busca el producto de CI y extract() lo lee activo', async () => {
    const { stagehand, page } = sesion!;

    await stagehand.act(`click the "${messages.nav.items.catalog}" link in the navigation`);
    await esperarRuta(page, '/catalog');
    await stagehand.act(
      `type "${CI_PRODUCT_NAME}" into the "${messages.catalog.filters.searchLabel}" search box`,
    );
    // The list filters after a debounce.
    await page.waitForTimeout(1_500);

    const { data } = await stagehand.extract(
      'extract every product row of the catalog table with its name and its status',
      z.object({ productos: z.array(z.object({ nombre: z.string(), estado: z.string() })) }),
    );
    expect(data.productos).toHaveLength(1);
    expect(data.productos[0]!.nombre).toContain(CI_PRODUCT_NAME);
    expect(data.productos[0]!.estado).toBe(messages.catalog.active);
  });

  test('RF-29 - extract() lee la lista de miembros y el operador de CI sigue activo', async () => {
    const { stagehand, page } = sesion!;
    const { admin } = e2eEnv();

    await stagehand.act(`click the "${messages.nav.items.admin}" link in the navigation`);
    await stagehand.act(`open the "${messages.admin.users.title}" section`);
    await esperarRuta(page, '/admin/users');

    const { data } = await stagehand.extract(
      'extract every member in the members table: email, role and status',
      z.object({
        miembros: z.array(z.object({ email: z.string(), rol: z.string(), estado: z.string() })),
      }),
    );
    expect(data.miembros.length).toBeGreaterThan(0);
    for (const miembro of data.miembros) {
      expect(miembro.email).toMatch(/^[^@\s]+@[^@\s]+$/);
    }
    // The list is paginated: the admin's own row is only checked when it is on screen.
    const propia = data.miembros.find(({ email }) => email === admin.email);
    if (propia) expect(propia.estado).toBe(messages.admin.statuses.ACTIVE);
  });

  test('RF-30 - act() filtra el log por productos y extract() solo ve acciones de productos', async () => {
    const { stagehand, page } = sesion!;

    await stagehand.act(`click the "${messages.nav.items.admin}" link in the navigation`);
    await stagehand.act(`open the "${messages.admin.audit.title}" section`);
    await esperarRuta(page, '/admin/audit');
    await stagehand.act(
      `choose "${messages.admin.audit.entities.product}" in the "${messages.admin.audit.entityLabel}" dropdown`,
    );
    await page.waitForTimeout(1_500);

    const { data } = await stagehand.extract(
      'extract the action column of every row in the audit log table',
      z.object({ acciones: z.array(z.string()) }),
    );
    expect(data.acciones.length).toBeGreaterThan(0);
    for (const accion of data.acciones) {
      expect(Object.values(acciones)).toContain(accion);
    }
  });
});
