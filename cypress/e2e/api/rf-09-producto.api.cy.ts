import { CI_PRODUCT_NAME } from '@cy/support/commands';

interface Producto {
  id: string;
  name: string;
  minimumStock: number | null;
}

const FOREIGN_ID = '00000000-0000-4000-8000-000000000000';

/** RF-09 en la API sobre el producto fijo de CI, que se deja como estaba. */
describe('RF-09 - API de productos', () => {
  let admin = '';
  let producto: Producto;

  before(() => {
    cy.apiLogin('ADMIN').then((token) => {
      admin = token;
      cy.api<{ data: Producto[] }>(
        'GET',
        `/products?search=${encodeURIComponent(CI_PRODUCT_NAME)}&status=all`,
        { token },
      ).then((respuesta) => {
        producto = respuesta.body.data.find((candidato) => candidato.name === CI_PRODUCT_NAME)!;
      });
    });
  });

  it('Caso 1 (exitoso) - la búsqueda encuentra el producto por su nombre', () => {
    expect(producto, CI_PRODUCT_NAME).to.exist;
    cy.api<Producto>('GET', `/products/${producto.id}`, { token: admin }).then((respuesta) => {
      expect(respuesta.status).to.eq(200);
      expect(respuesta.body.name).to.eq(CI_PRODUCT_NAME);
    });
  });

  it('Caso 2 (exitoso) - editar el mínimo lo aplica y restaurarlo lo devuelve', () => {
    const original = producto.minimumStock ?? 0;
    cy.api<Producto>('PATCH', `/products/${producto.id}`, {
      token: admin,
      body: { minimumStock: original + 1 },
    }).then((respuesta) => {
      expect(respuesta.status).to.eq(200);
      expect(respuesta.body.minimumStock).to.eq(original + 1);
    });
    cy.api<Producto>('PATCH', `/products/${producto.id}`, {
      token: admin,
      body: { minimumStock: original },
    })
      .its('body.minimumStock')
      .should('eq', original);
  });

  it('Caso 3 (error) - un mínimo negativo o un campo no declarado responden 400', () => {
    cy.api('PATCH', `/products/${producto.id}`, { token: admin, body: { minimumStock: -1 } })
      .its('status')
      .should('eq', 400);
    cy.api('PATCH', `/products/${producto.id}`, {
      token: admin,
      body: { organizationId: FOREIGN_ID },
    })
      .its('status')
      .should('eq', 400);
  });

  it('Caso 4 (alternativo) - un id ajeno responde 404 y uno mal formado 400', () => {
    cy.api('GET', `/products/${FOREIGN_ID}`, { token: admin }).its('status').should('eq', 404);
    cy.api('GET', '/products/no-es-un-uuid', { token: admin }).its('status').should('eq', 400);
  });
});
