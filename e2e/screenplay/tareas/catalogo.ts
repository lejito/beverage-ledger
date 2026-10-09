import { Task, Wait } from '@serenity-js/core';
import { By, Clear, Click, Enter, isVisible, Navigate, PageElement, Value } from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import { Boton, Campo, Dialogo, FilaCon, Notificacion } from '@e2e/screenplay/preguntas/pantalla';

const catalogo = messages.catalog;
const formulario = catalogo.form;

// Labelled with aria-label, not with a <label>, so Campo() does not find it.
const Busqueda = () =>
  PageElement.located(By.role('searchbox', { name: catalogo.filters.searchLabel })).describedAs(
    'la búsqueda del catálogo',
  );

export const AbrirLaEdicionDe = (producto: string) =>
  Task.where(
    `#actor abre la edición de ${producto}`,
    Navigate.to('/catalog'),
    Enter.theValue(producto).into(Busqueda()),
    Click.on(Boton(messages.common.actions.edit).of(FilaCon(producto))),
    Wait.until(Campo(formulario.minimumStock).of(Dialogo()), isVisible()),
  );

export const FijarLaExistenciaMinima = (valor: string) =>
  Task.where(
    `#actor fija la existencia mínima en ${valor}`,
    Clear.theValueOf(Campo(formulario.minimumStock).of(Dialogo())),
    Enter.theValue(valor).into(Campo(formulario.minimumStock).of(Dialogo())),
    Click.on(Boton(messages.common.actions.save).of(Dialogo())),
    Wait.until(Notificacion(formulario.updatedTitle), isVisible()),
  );

/** The value the dialog was opened with, so the scenario can restore it. */
export const ExistenciaMinimaActual = () => Value.of(Campo(formulario.minimumStock).of(Dialogo()));
