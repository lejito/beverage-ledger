import { defineParameterType, Given, Then, When } from '@cucumber/cucumber';
import { Duration, Masked, Wait, type Actor } from '@serenity-js/core';
import { endsWith, Ensure, equals, includes } from '@serenity-js/assertions';
import { Click, Enter, Navigate } from '@serenity-js/web';
import type { Credentials } from '@e2e/support/env';
import { e2eEnv } from '@e2e/support/env';
import { messages } from '@e2e/support/browser';
import { Boton, Campo, Enlace, RutaActual } from '@e2e/screenplay/preguntas/pantalla';
import { EsperarQueLaAppEsteLista, IrA } from '@e2e/screenplay/tareas/navegacion';
import { IniciarSesion, RespetarElLimiteDeAutenticacion } from '@e2e/screenplay/tareas/sesion';
import { SeVeElTexto } from '@e2e/features/support/preguntas';

const textos = messages.auth;

defineParameterType({
  name: 'rol',
  regexp: /administradora|administrador|operadora|operador|manager/,
  transformer: (rol: string): Credentials => {
    const { admin, manager, operator } = e2eEnv();
    if (rol.startsWith('administrador')) return admin;
    return rol === 'manager' ? manager : operator;
  },
});

Given('(que ){actor} abre la pantalla de inicio de sesión', (actor: Actor) =>
  actor.attemptsTo(
    RespetarElLimiteDeAutenticacion(),
    Navigate.to('/login'),
    EsperarQueLaAppEsteLista(),
  ),
);

Given('(que ){actor} abre {string} sin haber iniciado sesión', (actor: Actor, ruta: string) =>
  actor.attemptsTo(
    RespetarElLimiteDeAutenticacion(),
    Navigate.to(ruta),
    Wait.upTo(Duration.ofSeconds(90)).until(RutaActual(), endsWith('/login')),
    EsperarQueLaAppEsteLista(),
  ),
);

Given('(que ){actor} inició sesión como {rol}', (actor: Actor, credenciales: Credentials) =>
  actor.attemptsTo(IniciarSesion.como(credenciales)),
);

When('{pronombre} entra como {rol}', (actor: Actor, credenciales: Credentials) =>
  actor.attemptsTo(
    Enter.theValue(credenciales.email).into(Campo(textos.fields.email)),
    Enter.theValue(Masked.valueOf(credenciales.password)).into(Campo(textos.fields.password)),
    Click.on(Boton(textos.signIn.submit)),
  ),
);

When(
  '{pronombre} escribe el correo {string} y la contraseña {string}',
  (actor: Actor, correo: string, contrasena: string) =>
    actor.attemptsTo(
      Enter.theValue(correo).into(Campo(textos.fields.email)),
      Enter.theValue(contrasena).into(Campo(textos.fields.password)),
    ),
);

When('{pronombre} envía el formulario', (actor: Actor) =>
  actor.attemptsTo(Click.on(Boton(textos.signIn.submit))),
);

When('{pronombre} va a {string}', (actor: Actor, ruta: string) => actor.attemptsTo(IrA(ruta)));

Then('{pronombre} llega al panel', (actor: Actor) =>
  actor.attemptsTo(Wait.upTo(Duration.ofSeconds(90)).until(RutaActual(), endsWith('/dashboard'))),
);

Then('{pronombre} llega a {string}', (actor: Actor, ruta: string) =>
  actor.attemptsTo(Wait.upTo(Duration.ofSeconds(90)).until(RutaActual(), equals(ruta))),
);

Then('{pronombre} no ve el enlace {string}', (actor: Actor, nombre: string) =>
  actor.attemptsTo(Ensure.that(Enlace(nombre).count(), equals(0))),
);

// A rejected sign-in may wait in the throttle queue first, like any other.
Then('{pronombre} ve el mensaje/aviso {string}', (actor: Actor, texto: string) =>
  actor.attemptsTo(Wait.upTo(Duration.ofSeconds(90)).until(SeVeElTexto(texto), equals(true))),
);

Then('{pronombre} sigue en la pantalla de inicio de sesión', (actor: Actor) =>
  actor.attemptsTo(Ensure.that(RutaActual(), includes('/login'))),
);
