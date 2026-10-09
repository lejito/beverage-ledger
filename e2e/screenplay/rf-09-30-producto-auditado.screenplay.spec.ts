import { Ensure, equals, isGreaterThan } from '@serenity-js/assertions';
import { describe, it, test } from '@serenity-js/playwright-test';
import { CI_PRODUCT_NAME, e2eEnv } from '@e2e/support/env';
import { elenco } from '@e2e/screenplay/support/elenco';
import { auditoria, IniciarSesionEnLaApi } from '@e2e/screenplay/tareas/api';
import {
  AbrirLaEdicionDe,
  ExistenciaMinimaActual,
  FijarLaExistenciaMinima,
} from '@e2e/screenplay/tareas/catalogo';
import { IniciarSesion } from '@e2e/screenplay/tareas/sesion';

test.use({
  actors: async ({ browser, contextOptions }, provide) => {
    await provide(elenco(browser, contextOptions));
  },
});

/** RF-09 y RF-30: lo que se cambia en el catálogo queda en la auditoría con su autor. */
describe('Un cambio de catálogo queda auditado', () => {
  it('la administradora edita el producto de CI y la auditoría registra quién lo hizo', async ({
    actorCalled,
  }) => {
    const { admin } = e2eEnv();
    const ana = actorCalled('Ana, administradora');
    const inicio = Date.now();

    await ana.attemptsTo(
      IniciarSesionEnLaApi.como(admin),
      IniciarSesion.como(admin),
      AbrirLaEdicionDe(CI_PRODUCT_NAME),
    );
    const original = await ana.answer(ExistenciaMinimaActual());

    try {
      await ana.attemptsTo(FijarLaExistenciaMinima(String(Number(original || '0') + 1)));

      const [ultima] = await auditoria(ana, 'entity=product&action=product.updated&pageSize=1');
      await ana.attemptsTo(
        Ensure.that(ultima?.user.email ?? '', equals(admin.email)),
        Ensure.that(new Date(ultima?.createdAt ?? 0).getTime(), isGreaterThan(inicio - 60_000)),
      );
    } finally {
      await ana.attemptsTo(
        AbrirLaEdicionDe(CI_PRODUCT_NAME),
        FijarLaExistenciaMinima(original || '0'),
      );
    }
  });
});
