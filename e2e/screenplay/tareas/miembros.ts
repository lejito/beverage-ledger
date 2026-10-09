import { Duration, Interaction, notes, Task, TakeNotes, Wait } from '@serenity-js/core';
import { endsWith } from '@serenity-js/assertions';
import { Click, Enter, isVisible, Navigate, Value } from '@serenity-js/web';
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
import { RespetarElLimiteDeAutenticacion } from '@e2e/screenplay/tareas/sesion';

const usuarios = messages.admin.users;
const invitaciones = messages.admin.invitations.form;
const invitacion = messages.invite;
const contrasena = messages.profile.password;

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
    Navigate.to('/admin/users'),
    Click.on(Boton(usuarios.new)),
    Enter.theValue(email).into(Campo(invitaciones.email).of(Dialogo())),
    Click.on(Boton(invitaciones.submit).of(Dialogo())),
    Wait.until(Campo(invitaciones.link).of(Dialogo()), isVisible()),
    CopiarElEnlaceDeLaInvitacion(),
  );

export const AceptarLaInvitacion = (nombre: string, contrasenaNueva: string) =>
  Task.where(
    `#actor acepta la invitación como ${nombre}`,
    RespetarElLimiteDeAutenticacion(),
    Navigate.to(notes<Notas>().get('rutaDeInvitacion')),
    Enter.theValue(nombre).into(Campo(invitacion.name)),
    Enter.theValue(contrasenaNueva).into(Campo(invitacion.password)),
    Click.on(Boton(invitacion.submit)),
    Wait.upTo(Duration.ofSeconds(30)).until(RutaActual(), endsWith('/dashboard')),
  );

export const CambiarSuContrasena = (actual: string, nueva: string) =>
  Task.where(
    '#actor cambia su contraseña',
    Navigate.to('/profile'),
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
    Navigate.to('/admin/users'),
    Click.on(Boton(usuarios.suspend).of(FilaCon(email))),
    Click.on(Boton(usuarios.suspend).of(Dialogo())),
    Wait.until(Notificacion(usuarios.suspendedTitle), isVisible()),
  );
