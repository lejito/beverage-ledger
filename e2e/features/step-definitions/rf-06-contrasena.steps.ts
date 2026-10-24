import { Given, Then, When } from '@cucumber/cucumber';
import type { Actor } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { Click, Enter } from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import { Boton, Campo, RutaActual } from '@e2e/screenplay/preguntas/pantalla';
import { IrA } from '@e2e/screenplay/tareas/navegacion';

const textos = messages.profile.password;

Given('{pronombre} abre su perfil', (actor: Actor) => actor.attemptsTo(IrA('/profile')));

When(
  '{pronombre} intenta cambiar la contraseña {string} por {string} repitiendo {string}',
  (actor: Actor, actual: string, nueva: string, repetida: string) =>
    actor.attemptsTo(
      Enter.theValue(actual).into(Campo(textos.current)),
      Enter.theValue(nueva).into(Campo(textos.new)),
      Enter.theValue(repetida).into(Campo(textos.repeat)),
      Click.on(Boton(textos.submit)),
    ),
);

Then('{pronombre} sigue en su perfil', (actor: Actor) =>
  actor.attemptsTo(Ensure.that(RutaActual(), equals('/profile'))),
);
