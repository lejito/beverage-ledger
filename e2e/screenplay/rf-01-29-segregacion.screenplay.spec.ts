import { Ensure, equals } from '@serenity-js/assertions';
import { describe, it, test } from '@serenity-js/playwright-test';
import { Duration, Wait } from '@serenity-js/core';
import { isVisible, PageElement, By } from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';
import { Enlace } from '@e2e/screenplay/preguntas/pantalla';
import { elenco } from '@e2e/screenplay/support/elenco';
import { IrA } from '@e2e/screenplay/tareas/navegacion';
import { IniciarSesion } from '@e2e/screenplay/tareas/sesion';

test.use({
  actors: async ({ browser, contextOptions }, provide) => {
    await provide(elenco(browser, contextOptions));
  },
});

const AvisoDeSinPermiso = () =>
  PageElement.located(
    By.cssContainingText('h2, h3, p', messages.auth.permissionGate.title),
  ).describedAs('el aviso de que la sección no está a su alcance');

/** RF-01 y RF-29: quien mueve la mercancía no administra a quienes la mueven. */
describe('Segregación de funciones en la interfaz', () => {
  it('un operador entra sin acceso a la administración, ni desde el menú ni por la URL', async ({
    actorCalled,
  }) => {
    await actorCalled('Óscar, operador').attemptsTo(
      IniciarSesion.como(e2eEnv().operator),
      Ensure.that(Enlace(messages.nav.items.admin).count(), equals(0)),
      IrA('/admin/users'),
      Wait.upTo(Duration.ofSeconds(15)).until(AvisoDeSinPermiso(), isVisible()),
    );
  });
});
