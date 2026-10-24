import { Before, Then, When } from '@cucumber/cucumber';
import { Duration, notes, Task, Wait, type Actor } from '@serenity-js/core';
import { Ensure, equals, isPresent, startsWith } from '@serenity-js/assertions';
import { Click, isVisible, Navigate } from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import { Boton, Dialogo, FilaCon } from '@e2e/screenplay/preguntas/pantalla';
import type { Notas } from '@e2e/screenplay/support/elenco';
import { InvitarA } from '@e2e/screenplay/tareas/miembros';
import { IrA } from '@e2e/screenplay/tareas/navegacion';
import { RespetarElLimiteDeAutenticacion } from '@e2e/screenplay/tareas/sesion';
import { SeVeElTexto } from '@e2e/features/support/preguntas';

const textos = messages.admin.invitations;

let invitado = '';

Before({ tags: '@rf-03' }, () => {
  invitado = `ci-gherkin+${Date.now()}@beverageledger.test`;
});

const CancelarLaInvitacionDe = (email: string) =>
  Task.where(
    `#actor cancela la invitación de ${email}`,
    IrA('/admin/users'),
    // Present, not visible: the invitations sit under the members, often below the
    // fold, and isVisible also asks for the viewport. The click scrolls to it.
    Wait.upTo(Duration.ofSeconds(30)).until(FilaCon(email), isPresent()),
    Click.on(Boton(textos.revoke).of(FilaCon(email))),
    Wait.until(Dialogo(), isVisible()),
    Click.on(Boton(textos.revokeConfirm).of(Dialogo())),
    Wait.upTo(Duration.ofSeconds(30)).until(SeVeElTexto(textos.revoked), equals(true)),
  );

const AbrirElEnlaceDeLaInvitacion = () =>
  Task.where(
    '#actor abre el enlace de la invitación',
    RespetarElLimiteDeAutenticacion(),
    Navigate.to(notes<Notas>().get('rutaDeInvitacion')),
  );

When('{pronombre} invita a una persona nueva como operadora', (actor: Actor) =>
  actor.attemptsTo(InvitarA(invitado)),
);

When('{pronombre} cancela esa invitación', (actor: Actor) =>
  actor.attemptsTo(CancelarLaInvitacionDe(invitado)),
);

Then('{pronombre} recibe un enlace de invitación', (actor: Actor) =>
  actor.attemptsTo(Ensure.that(notes<Notas>().get('rutaDeInvitacion'), startsWith('/invite/'))),
);

// The preview is fetched through a throttled route and may wait for its slot.
Then('{actor}, al abrir ese enlace, ve el correo invitado', (actor: Actor) =>
  actor.attemptsTo(
    AbrirElEnlaceDeLaInvitacion(),
    Wait.upTo(Duration.ofSeconds(90)).until(SeVeElTexto(invitado), equals(true)),
  ),
);

Then('{actor}, al abrir ese enlace, ve el aviso {string}', (actor: Actor, aviso: string) =>
  actor.attemptsTo(
    AbrirElEnlaceDeLaInvitacion(),
    Wait.upTo(Duration.ofSeconds(90)).until(SeVeElTexto(aviso), equals(true)),
  ),
);
