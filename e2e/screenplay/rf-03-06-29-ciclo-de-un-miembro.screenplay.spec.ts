import { Ensure, endsWith, equals, isGreaterThan } from '@serenity-js/assertions';
import { describe, it, test } from '@serenity-js/playwright-test';
import { Duration, Wait } from '@serenity-js/core';
import { isVisible } from '@serenity-js/web';
import { e2eEnv } from '@e2e/support/env';
import { Alerta, RutaActual } from '@e2e/screenplay/preguntas/pantalla';
import { elenco } from '@e2e/screenplay/support/elenco';
import {
  AsegurarQueEsteSuspendido,
  auditoria,
  idDelMiembro,
  IniciarSesionEnLaApi,
} from '@e2e/screenplay/tareas/api';
import {
  AceptarLaInvitacion,
  CambiarSuContrasena,
  InvitarA,
  Suspender,
} from '@e2e/screenplay/tareas/miembros';
import { IniciarSesion, IntentarIniciarSesion } from '@e2e/screenplay/tareas/sesion';

test.use({
  actors: async ({ browser, contextOptions }, provide) => {
    await provide(elenco(browser, contextOptions));
  },
});

/**
 * RF-03, RF-06 y RF-29 como una sola historia: el único miembro que crea cada
 * corrida entra por invitación, cambia su contraseña y termina suspendido, que
 * es como queda en la base desplegada pase lo que pase.
 */
describe('Ciclo de vida de un miembro', () => {
  const { admin } = e2eEnv();
  const email = `ci-screenplay+${Date.now()}@beverageledger.test`;
  const primera = `Ci-Primera-${Date.now()}a`;
  const segunda = `Ci-Segunda-${Date.now()}b`;

  it('un operador invitado entra, cambia su contraseña y deja de entrar al ser suspendido', async ({
    actorCalled,
  }) => {
    const ana = actorCalled('Ana, administradora');
    const nico = actorCalled('Nico, operador invitado');

    try {
      await ana.attemptsTo(
        IniciarSesionEnLaApi.como(admin),
        IniciarSesion.como(admin),
        InvitarA(email),
      );

      await nico.attemptsTo(
        AceptarLaInvitacion('Nico Invitado', primera),
        CambiarSuContrasena(primera, segunda),
        IniciarSesion.como({ email, password: segunda }),
      );

      await ana.attemptsTo(Suspender(email));

      await nico.attemptsTo(
        IntentarIniciarSesion.como({ email, password: segunda }),
        Wait.upTo(Duration.ofSeconds(15)).until(Alerta(), isVisible()),
        Ensure.that(RutaActual(), endsWith('/login')),
      );

      const id = await idDelMiembro(ana, email);
      const sobreElMiembro = (accion: string) => auditoria(ana, `action=${accion}&entityId=${id}`);
      await ana.attemptsTo(
        Ensure.that((await sobreElMiembro('user.password-changed')).length, equals(1)),
        Ensure.that((await sobreElMiembro('user.updated')).length, isGreaterThan(0)),
      );
    } finally {
      await ana.attemptsTo(AsegurarQueEsteSuspendido(email));
    }
  });
});
