import { Duration, Interaction, notes, Task, TakeNotes, Wait } from '@serenity-js/core';
import { endsWith } from '@serenity-js/assertions';
import {
  By,
  Click,
  Enter,
  isVisible,
  Key,
  Navigate,
  PageElements,
  Press,
  Value,
} from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import {
  Boton,
  Campo,
  Dialogo,
  FilaCon,
  Notificacion,
  RutaActual,
} from '@e2e/screenplay/preguntas/pantalla';
import type { Notas } from '@e2e/screenplay/support/elenco';
import { EsperarQueLaAppEsteLista, IrA } from '@e2e/screenplay/tareas/navegacion';
import { RespetarElLimiteDeAutenticacion } from '@e2e/screenplay/tareas/sesion';

const usuarios = messages.admin.users;
const invitaciones = messages.admin.invitations.form;
const invitacion = messages.invite;
const contrasena = messages.profile.password;

// The invitations card below has its own refresh button: the members' one comes first.
const ActualizarMiembros = () =>
  PageElements.located(By.role('button', { name: messages.common.actions.refresh }))
    .first()
    .describedAs('el botón «Actualizar» de la lista de miembros');

/** The link is shown once and points at the deployed front; the actor keeps its path. */
const CopiarElEnlaceDeLaInvitacion = () =>
  Interaction.where('#actor copia el enlace de la invitación', async (actor) => {
    const enlace = await actor.answer(Value.of(Campo(invitaciones.link).of(Dialogo())));
    (TakeNotes.as(actor) as TakeNotes<Notas>).notepad.set(
      'rutaDeInvitacion',
      new URL(enlace).pathname,
    );
  });

export const InvitarA = (email: string) =>
  Task.where(
    `#actor invita a ${email} como operador`,
    IrA('/admin/users'),
    Click.on(Boton(usuarios.new)),
    Enter.theValue(email).into(Campo(invitaciones.email).of(Dialogo())),
    Click.on(Boton(invitaciones.submit).of(Dialogo())),
    Wait.until(Campo(invitaciones.link).of(Dialogo()), isVisible()),
    CopiarElEnlaceDeLaInvitacion(),
    // Left open, the modal hides the rest of the screen from every later step.
    Press.the(Key.Escape),
  );

export const AceptarLaInvitacion = (nombre: string, contrasenaNueva: string) =>
  Task.where(
    `#actor acepta la invitación como ${nombre}`,
    RespetarElLimiteDeAutenticacion(),
    Navigate.to(notes<Notas>().get('rutaDeInvitacion')),
    EsperarQueLaAppEsteLista(),
    Enter.theValue(nombre).into(Campo(invitacion.name)),
    Enter.theValue(contrasenaNueva).into(Campo(invitacion.password)),
    Click.on(Boton(invitacion.submit)),
    Wait.upTo(Duration.ofSeconds(90)).until(RutaActual(), endsWith('/dashboard')),
  );

export const CambiarSuContrasena = (actual: string, nueva: string) =>
  Task.where(
    '#actor cambia su contraseña',
    IrA('/profile'),
    Enter.theValue(actual).into(Campo(contrasena.current)),
    Enter.theValue(nueva).into(Campo(contrasena.new)),
    Enter.theValue(nueva).into(Campo(contrasena.repeat)),
    Click.on(Boton(contrasena.submit)),
    Wait.until(Notificacion(contrasena.changedTitle), isVisible()),
    Wait.upTo(Duration.ofSeconds(30)).until(RutaActual(), endsWith('/login')),
  );

export const Suspender = (email: string) =>
  Task.where(
    `#actor suspende a ${email}`,
    IrA('/admin/users'),
    // The list was cached when the invitation went out, before this member existed.
    Wait.upTo(Duration.ofSeconds(30)).until(ActualizarMiembros(), isVisible()),
    Click.on(ActualizarMiembros()),
    Wait.upTo(Duration.ofSeconds(30)).until(FilaCon(email), isVisible()),
    Click.on(Boton(usuarios.suspend).of(FilaCon(email))),
    Click.on(Boton(usuarios.suspend).of(Dialogo())),
    Wait.until(Notificacion(usuarios.suspendedTitle), isVisible()),
  );
