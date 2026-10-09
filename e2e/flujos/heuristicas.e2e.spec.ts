import { expect, test, type Page } from '@playwright/test';
import {
  AFTER_THROTTLED_CALL,
  expectAccessible,
  messages,
  navigateInApp,
  newPage,
  newSignedInPage,
} from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';

/**
 * Las preguntas de la evaluación heurística que se pueden comprobar, convertidas
 * en evidencia en vez de opinión, sobre las pantallas de RF-01, 03, 06, 09, 29 y 30.
 * El número de cada caso es el de la pregunta en Evaluacion_Heuristica.xlsx.
 */
const PANTALLAS_CON_SESION = [
  { ruta: '/catalog', titulo: messages.catalog.title },
  { ruta: '/admin/users', titulo: messages.admin.users.title },
  { ruta: '/admin/audit', titulo: messages.admin.audit.title },
  { ruta: '/profile', titulo: null },
];

test.describe('Heurísticas verificables en las pantallas de las 6 funcionalidades', () => {
  test('Heurísticas 49 a 52 - las pantallas públicas no tienen barreras WCAG 2.1 AA', async ({
    browser,
  }) => {
    const page = await newPage(browser);

    await page.goto('/login');
    await expectAccessible(page);

    await page.goto('/invite/enlace-inexistente');
    await expect(page.getByText(messages.invite.invalidTitle)).toBeVisible(AFTER_THROTTLED_CALL);
    await expectAccessible(page);
  });

  test.describe.serial('con la sesión de un administrador', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      page = await newSignedInPage(browser, e2eEnv().admin);
    });

    for (const { ruta, titulo } of PANTALLAS_CON_SESION) {
      test(`Heurísticas 1 y 49 a 52 - ${ruta} tiene título visible y no tiene barreras WCAG 2.1 AA`, async () => {
        await navigateInApp(page, ruta);
        if (titulo)
          await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expectAccessible(page);
      });
    }

    // Pendiente · heurísticas 41 y 42: no hay ayuda dentro de la aplicación; las
    // preguntas frecuentes solo están en la página pública.
    test.fixme(
      'Pendiente heurísticas 41 y 42 - las pantallas de administración enlazan a una ayuda',
      async () => {
        await navigateInApp(page, '/admin/users');

        await expect(page.getByRole('link', { name: /ayuda/i })).toBeVisible();
      },
    );
  });

  test.describe.serial('en un teléfono de 375 px', () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      page = await newPage(browser, { width: 375, height: 812 });
      await page.goto('/login');
    });

    test('Heurística 27 - el login cabe sin desplazamiento horizontal', async () => {
      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );

      expect(desborde).toBeLessThanOrEqual(0);
    });
  });
});
