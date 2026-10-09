import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CatalogView } from '@/features/catalog/CatalogView';
import { apiError, fakeApi, json } from '@tests/support/fake-api';
import { page, PRODUCT } from '@tests/support/pages';
import { messages, renderScreen } from '@tests/support/render-screen';

const textos = messages.catalog;
const tituloDeConfirmacion = `¿Desactivar ${PRODUCT.name}?`;

const desactivar = async () => {
  const [boton] = await screen.findAllByRole('button', { name: textos.deactivate });
  fireEvent.click(boton!);
  return screen.findByRole('dialog');
};

/**
 * Regresión funcional de RF-09 sobre la pantalla real del catálogo. Desactivar
 * es la acción que saca un producto de los movimientos nuevos, así que siempre
 * pasa por una confirmación (heurísticas 30 y 34).
 */
describe('RF-09 - Pantalla del catálogo', () => {
  beforeEach(() => {
    fakeApi.on('GET /api/v1/products', json(200, page([PRODUCT])));
    fakeApi.on('GET /api/v1/categories', json(200, page([PRODUCT.category])));
    fakeApi.on('GET /api/v1/brands', json(200, page([PRODUCT.brand])));
  });

  it('Caso 1 - un administrador ve el producto y las acciones para gestionarlo', async () => {
    renderScreen(<CatalogView />, 'ORG_ADMIN');

    expect((await screen.findAllByText(PRODUCT.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: textos.new }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: textos.deactivate }).length).toBeGreaterThan(0);
  });

  it('Caso 2 - un operador ve el catálogo pero ninguna acción de gestión', async () => {
    renderScreen(<CatalogView />, 'OPERATOR');

    expect((await screen.findAllByText(PRODUCT.name)).length).toBeGreaterThan(0);
    expect(screen.getByText(textos.subtitleRead)).toBeTruthy();
    expect(screen.queryByRole('button', { name: textos.deactivate })).toBeNull();
  });

  it('Caso 3 - desactivar pide confirmación y cancelar no cambia nada', async () => {
    renderScreen(<CatalogView />, 'ORG_ADMIN');

    const dialogo = await desactivar();
    expect(within(dialogo).getByText(tituloDeConfirmacion)).toBeTruthy();
    expect(within(dialogo).getByText(textos.toggle.deactivateDescription)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: messages.common.actions.cancel }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fakeApi.callsTo(`PATCH /api/v1/products/${PRODUCT.id}`)).toHaveLength(0);
  });

  it('Caso 4 - confirmar desactiva el producto y lo anuncia', async () => {
    fakeApi.on(`PATCH /api/v1/products/${PRODUCT.id}`, json(200, { ...PRODUCT, isActive: false }));
    renderScreen(<CatalogView />, 'ORG_ADMIN');

    const dialogo = await desactivar();
    fireEvent.click(within(dialogo).getByRole('button', { name: textos.deactivate }));

    expect(await screen.findByText(textos.toggle.deactivatedTitle)).toBeTruthy();
    expect(fakeApi.callsTo(`PATCH /api/v1/products/${PRODUCT.id}`)[0]?.body).toEqual({
      isActive: false,
    });
  });

  it('Caso 5 - si la API rechaza el cambio, se avisa con su motivo', async () => {
    fakeApi.on(
      `PATCH /api/v1/products/${PRODUCT.id}`,
      apiError(409, 'The product changed meanwhile'),
    );
    renderScreen(<CatalogView />, 'ORG_ADMIN');

    const dialogo = await desactivar();
    fireEvent.click(within(dialogo).getByRole('button', { name: textos.deactivate }));

    expect(await screen.findByText(textos.toggle.failed)).toBeTruthy();
    expect(screen.getByText('The product changed meanwhile')).toBeTruthy();
  });
});
