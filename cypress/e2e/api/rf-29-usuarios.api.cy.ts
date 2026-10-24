interface Miembro {
  id: string;
  email: string;
  role: string;
  status: string;
}

const FOREIGN_ID = '00000000-0000-4000-8000-000000000000';

/** RF-29 en la API sin cambiar a nadie de forma permanente. */
describe('RF-29 - API de usuarios', () => {
  let admin = '';

  before(() => {
    cy.apiLogin('ADMIN').then((token) => {
      admin = token;
    });
  });

  it('Caso 1 (exitoso) - el listado está paginado en el servidor', () => {
    cy.api<{ data: Miembro[] }>('GET', '/users?page=1&pageSize=5', { token: admin }).then(
      (respuesta) => {
        expect(respuesta.status).to.eq(200);
        expect(respuesta.body.data).to.have.length.within(1, 5);
        respuesta.body.data.forEach((miembro) => {
          expect(miembro).to.include.all.keys('id', 'email', 'role', 'status');
        });
      },
    );
  });

  it('Caso 2 (error) - un tamaño de página fuera de rango responde 400', () => {
    cy.api('GET', '/users?pageSize=500', { token: admin }).its('status').should('eq', 400);
  });

  it('Caso 3 (error) - un administrador no puede cambiar su propio rol', () => {
    cy.api<{ user: Miembro }>('GET', '/auth/me', { token: admin }).then(({ body }) => {
      cy.api('PATCH', `/users/${body.user.id}`, { token: admin, body: { role: 'MANAGER' } })
        .its('status')
        .should('eq', 400);
    });
  });

  it('Caso 4 (alternativo) - un id que no es de la organización responde 404, no 403', () => {
    cy.api('GET', `/users/${FOREIGN_ID}`, { token: admin }).its('status').should('eq', 404);
  });
});
