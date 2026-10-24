import { Then, When } from '@cucumber/cucumber';
import { actorInTheSpotlight, Duration, Interaction, Wait, type Actor } from '@serenity-js/core';
import { equals } from '@serenity-js/assertions';
import { BrowseTheWebWithPlaywright, type PlaywrightPage } from '@serenity-js/playwright';
import { By, Click, isVisible, PageElement } from '@serenity-js/web';
import { expect, type Locator } from '@playwright/test';
import { findRowOnAnyPage, messages } from '@e2e/support/browser';
import { e2eEnv } from '@e2e/support/env';
import { Boton, Dialogo } from '@e2e/screenplay/preguntas/pantalla';
import { IrA } from '@e2e/screenplay/tareas/navegacion';
import { SeVeElTexto } from '@e2e/features/support/preguntas';

const usuarios = messages.admin.users;
const auditoria = messages.admin.audit;

/**
 * Works on a member's row wherever it is: the deployed database grows with
 * every run, so nobody stays on the first page of the list.
 */
const EnLaFilaDe = (email: string, descripcion: string, accion: (fila: Locator) => Promise<void>) =>
  Interaction.where(`#actor ${descripcion}`, async (actor) => {
    const page = (await BrowseTheWebWithPlaywright.as(actor).currentPage()) as PlaywrightPage;
    await accion(await findRowOnAnyPage(await page.nativePage(), email));
  });

When('{pronombre} abre la lista de usuarios', (actor: Actor) =>
  actor.attemptsTo(IrA('/admin/users')),
);

Then('su propia fila dice {string} y no ofrece {string}', (marca: string, accion: string) =>
  actorInTheSpotlight().attemptsTo(
    EnLaFilaDe(e2eEnv().admin.email, 'revisa su propia fila', async (fila) => {
      await expect(fila.getByText(marca, { exact: true })).toBeVisible();
      await expect(fila.getByRole('button', { name: accion })).toHaveCount(0);
    }),
  ),
);

When('{pronombre} empieza a suspender al operador de CI pero cancela', (actor: Actor) =>
  actor.attemptsTo(
    EnLaFilaDe(e2eEnv().operator.email, 'pulsa «Suspender» en la fila del operador', (fila) =>
      fila.getByRole('button', { name: usuarios.suspend }).click(),
    ),
    Wait.until(Dialogo(), isVisible()),
    Wait.until(SeVeElTexto(usuarios.suspendDescription), equals(true)),
    Click.on(Boton(messages.common.actions.cancel).of(Dialogo())),
  ),
);

Then('el operador de CI sigue {string}', (estado: string) =>
  actorInTheSpotlight().attemptsTo(
    EnLaFilaDe(e2eEnv().operator.email, 'revisa el estado del operador', (fila) =>
      expect(fila.getByText(estado, { exact: true })).toBeVisible(),
    ),
  ),
);

When('{pronombre} abre el log de auditoría', (actor: Actor) =>
  actor.attemptsTo(IrA('/admin/audit')),
);

When('{pronombre} filtra por la entidad {string}', (actor: Actor, entidad: string) =>
  actor.attemptsTo(
    Click.on(
      PageElement.located(By.role('combobox', { name: auditoria.entityLabel })).describedAs(
        'el filtro de entidad',
      ),
    ),
    Click.on(
      PageElement.located(By.role('option', { name: entidad })).describedAs(
        `la opción «${entidad}»`,
      ),
    ),
  ),
);

Then(
  '{pronombre} ve las columnas {string}, {string} y {string}',
  // Cucumber checks the arity against the expression, so no rest parameter here.
  (actor: Actor, primera: string, segunda: string, tercera: string) =>
    actor.attemptsTo(
      ...[primera, segunda, tercera].map((columna) =>
        Wait.upTo(Duration.ofSeconds(30)).until(
          PageElement.located(By.role('columnheader', { name: columna })).describedAs(
            `la columna «${columna}»`,
          ),
          isVisible(),
        ),
      ),
    ),
);
