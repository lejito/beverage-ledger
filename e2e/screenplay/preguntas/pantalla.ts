import { PageElement, PageElements, By, Page, Text } from '@serenity-js/web';
import { includes } from '@serenity-js/assertions';

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

/** The table row that mentions a text, such as a member's email. */
export const FilaCon = (texto: string) =>
  PageElements.located(By.role('row'))
    .where(Text, includes(texto))
    .first()
    .describedAs(`la fila de «${texto}»`);

export const RutaActual = () => Page.current().url().pathname.describedAs('la ruta actual');
