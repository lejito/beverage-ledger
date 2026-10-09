import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UsersView } from '@/features/admin/UsersView';
import { CatalogView } from '@/features/catalog/CatalogView';
import { fakeApi, json } from '@tests/support/fake-api';
import { MEMBER, page, PRODUCT } from '@tests/support/pages';
import { renderScreen } from '@tests/support/render-screen';

const CARGA = '<img src="x" onerror="window.__inyectado = true">';

declare global {
  interface Window {
    __inyectado?: boolean;
  }
}

/**
 * Regresión de seguridad de RF-09 y RF-29: lo que un usuario escribe (el nombre
 * de un producto, el de un miembro) vuelve a la pantalla como texto, nunca como
 * HTML que el navegador ejecute.
 */
describe('RF-09 y RF-29 - El contenido de los usuarios se pinta escapado', () => {
  afterEach(() => {
    delete window.__inyectado;
  });

  it('Caso 1 - el nombre de un producto con HTML se muestra como texto', async () => {
    fakeApi.on('GET /api/v1/products', json(200, page([{ ...PRODUCT, name: CARGA }])));
    renderScreen(<CatalogView />, 'ORG_ADMIN');

    expect((await screen.findAllByText(CARGA)).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(window.__inyectado).toBeUndefined();
  });

  it('Caso 2 - el nombre de un miembro con HTML se muestra como texto', async () => {
    fakeApi.on('GET /api/v1/users', json(200, page([{ ...MEMBER, name: CARGA }])));
    fakeApi.on('GET /api/v1/invitations', json(200, page([])));
    renderScreen(<UsersView />, 'ORG_ADMIN');

    expect((await screen.findAllByText(CARGA)).length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(window.__inyectado).toBeUndefined();
  });
});
