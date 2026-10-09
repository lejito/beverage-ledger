import { Duration, Interaction, Task, Wait } from '@serenity-js/core';
import { endsWith } from '@serenity-js/assertions';
import { BrowseTheWebWithPlaywright, type PlaywrightPage } from '@serenity-js/playwright';
import { Click, Enter, Navigate } from '@serenity-js/web';
import type { Credentials } from '@e2e/support/env';
import { messages } from '@e2e/support/browser';
import { respectAuthThrottle } from '@e2e/support/throttle';
import { Boton, Campo, RutaActual } from '@e2e/screenplay/preguntas/pantalla';

const textos = messages.auth;

/** Every page load renews the session: the actor's browser has to respect the API's limit. */
export const RespetarElLimiteDeAutenticacion = () =>
  Interaction.where('#actor respeta el límite de autenticación de la API', async (actor) => {
    const page = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
    await respectAuthThrottle((await page.nativePage()).context());
  });

export const IntentarIniciarSesion = {
  como: ({ email, password }: Credentials) =>
    Task.where(
      `#actor intenta iniciar sesión como ${email}`,
      RespetarElLimiteDeAutenticacion(),
      Navigate.to('/login'),
      Enter.theValue(email).into(Campo(textos.fields.email)),
      Enter.theValue(password).into(Campo(textos.fields.password)),
      Click.on(Boton(textos.signIn.submit)),
    ),
};

export const IniciarSesion = {
  como: (credenciales: Credentials) =>
    Task.where(
      `#actor inicia sesión como ${credenciales.email}`,
      IntentarIniciarSesion.como(credenciales),
      Wait.upTo(Duration.ofSeconds(30)).until(RutaActual(), endsWith('/dashboard')),
    ),
};
