import { PageElement, PageElements, By, Page } from '@serenity-js/web';

/** A form control found by the text of its <label>, as a person finds it. */
export const Campo = (etiqueta: string) =>
  PageElement.located(
    By.xpath(`//*[@id=//label[normalize-space(.)="${etiqueta}"]/@for]`),
  ).describedAs(`el campo «${etiqueta}»`);

export const Boton = (nombre: string) =>
  PageElement.located(By.role('button', { name: nombre })).describedAs(`el botón «${nombre}»`);

export const Enlace = (nombre: string) =>
  PageElements.located(By.role('link', { name: nombre })).describedAs(`los enlaces «${nombre}»`);

export const Dialogo = () =>
  PageElement.located(By.role('dialog')).describedAs('el diálogo abierto');

// Scoped to the form: Next's route announcer also has role="alert", always empty.
export const Alerta = () =>
  PageElement.located(By.css('form [role="alert"]')).describedAs('la alerta del formulario');

export const Titulo = () =>
  PageElement.located(By.role('heading', { level: 1 })).describedAs('el título de la pantalla');

/** The toast the app shows after an action, found by its title. */
export const Notificacion = (titulo: string) =>
  PageElement.located(By.cssContainingText('[aria-live] h4', titulo)).describedAs(
    `el aviso «${titulo}»`,
  );

/**
 * The first table row that mentions a text, such as a member's email: on the
 * users screen the same email is also in the invitations table below. One
 * locator Playwright resolves on every check, not a read of every row's text:
 * rows re-render while a search settles, and asking for the text of a row
 * position that is gone waits with no timeout, past any Wait.upTo.
 */
export const FilaCon = (texto: string) =>
  PageElement.located(
    By.css(`:nth-match(tbody tr:has-text("${texto.replaceAll('"', '\\"')}"), 1)`),
  ).describedAs(`la fila de «${texto}»`);

export const RutaActual = () => Page.current().url().pathname.describedAs('la ruta actual');
