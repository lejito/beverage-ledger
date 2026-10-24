import { After, Then, When, type DataTable } from '@cucumber/cucumber';
import { actorInTheSpotlight, Duration, Wait, type Actor } from '@serenity-js/core';
import { Ensure, includes, property, equals } from '@serenity-js/assertions';
import { By, Clear, Click, Enter, isVisible, PageElement, Text } from '@serenity-js/web';
import { messages } from '@e2e/support/browser';
import { Boton, Campo, Dialogo, FilaCon } from '@e2e/screenplay/preguntas/pantalla';
import {
  AbrirLaEdicionDe,
  ExistenciaMinimaActual,
  FijarLaExistenciaMinima,
} from '@e2e/screenplay/tareas/catalogo';
import { IrA } from '@e2e/screenplay/tareas/navegacion';
import { FilasVisibles } from '@e2e/features/support/preguntas';

const catalogo = messages.catalog;

// Labelled with aria-label, not with a <label>, so Campo() does not find it.
const Busqueda = () =>
  PageElement.located(By.role('searchbox', { name: catalogo.filters.searchLabel })).describedAs(
    'la búsqueda del catálogo',
  );

/** What the edited product had, so the hook below can put it back. */
let original: { producto: string; minimo: string } | null = null;

When('{pronombre} busca {string} en el catálogo', (actor: Actor, texto: string) =>
  actor.attemptsTo(IrA('/catalog'), Enter.theValue(texto).into(Busqueda())),
);

Then('{pronombre} ve solamente los productos:', (actor: Actor, tabla: DataTable) => {
  const esperados = tabla.raw().map(([nombre]) => nombre!);
  return actor.attemptsTo(
    // The list filters after a debounce; the first frame still shows everything.
    Wait.upTo(Duration.ofSeconds(30)).until(
      FilasVisibles(),
      property('length', equals(esperados.length)),
    ),
    ...esperados.map((nombre) => Wait.until(FilaCon(nombre), isVisible())),
  );
});

When(
  '{pronombre} fija la existencia mínima de {string} en {string}',
  async (actor: Actor, producto: string, valor: string) => {
    await actor.attemptsTo(AbrirLaEdicionDe(producto));
    original ??= { producto, minimo: (await actor.answer(ExistenciaMinimaActual())) || '0' };
    await actor.attemptsTo(FijarLaExistenciaMinima(valor));
  },
);

When(
  '{pronombre} intenta fijar la existencia mínima de {string} en {string}',
  (actor: Actor, producto: string, valor: string) =>
    actor.attemptsTo(
      AbrirLaEdicionDe(producto),
      Clear.theValueOf(Campo(catalogo.form.minimumStock).of(Dialogo())),
      Enter.theValue(valor).into(Campo(catalogo.form.minimumStock).of(Dialogo())),
      Click.on(Boton(messages.common.actions.save).of(Dialogo())),
    ),
);

Then('la fila de {string} muestra {string}', (producto: string, valor: string) =>
  actorInTheSpotlight().attemptsTo(Ensure.that(Text.of(FilaCon(producto)), includes(valor))),
);

After({ tags: '@restaura-producto' }, async () => {
  if (!original) return;
  const { producto, minimo } = original;
  original = null;
  await actorInTheSpotlight().attemptsTo(
    AbrirLaEdicionDe(producto),
    FijarLaExistenciaMinima(minimo),
  );
});
