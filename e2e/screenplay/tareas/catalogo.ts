import { Duration, Task, Wait } from '@serenity-js/core';
import { equals } from '@serenity-js/assertions';
import {
  By,
  Clear,
  Click,
  Enter,
  isVisible,
  PageElement,
  PageElements,
  Value,
} from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import { Boton, Campo, Dialogo, FilaCon, Notificacion } from '@e2e/screenplay/preguntas/pantalla';
import { IrA } from '@e2e/screenplay/tareas/navegacion';

const catalogo = messages.catalog;
const formulario = catalogo.form;

// Labelled with aria-label, not with a <label>, so Campo() does not find it.
const Busqueda = () =>
  PageElement.located(By.role('searchbox', { name: catalogo.filters.searchLabel })).describedAs(
    'la búsqueda del catálogo',
  );

// Loading placeholders count too: they mention nothing.
const FilasQueNoMencionan = (texto: string) =>
  PageElements.located(
    By.css(`tbody tr:not(:has-text("${texto.replaceAll('"', '\\"')}"))`),
  ).describedAs(`las filas que no mencionan «${texto}»`);

export const AbrirLaEdicionDe = (producto: string) =>
  Task.where(
    `#actor abre la edición de ${producto}`,
    IrA('/catalog'),
    Enter.theValue(producto).into(Busqueda()),
    // The list filters after a debounce, and the product may already be on the
    // unfiltered first page: a row found before the filter lands is replaced
    // under the click. Settled means every row left is the product.
    Wait.upTo(Duration.ofSeconds(30)).until(FilasQueNoMencionan(producto).count(), equals(0)),
    Wait.upTo(Duration.ofSeconds(30)).until(FilaCon(producto), isVisible()),
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
