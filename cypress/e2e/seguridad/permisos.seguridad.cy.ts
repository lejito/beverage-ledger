import type { Role } from '@cy/support/commands';

interface Ruta {
  metodo: string;
  ruta: string;
  /** Quién puede, según la matriz de permissions.config.ts del backend. */
  roles: Role[];
}

const FOREIGN_ID = '00000000-0000-4000-8000-000000000000';

// The routes of RF-01, 03, 06, 09, 29 and 30. Writes are only ever sent by a role
// that must be refused, so no allowed request reaches the deployed database.
const RUTAS: Ruta[] = [
  { metodo: 'GET', ruta: '/auth/me', roles: ['OPERATOR', 'MANAGER', 'ADMIN'] },
  { metodo: 'GET', ruta: '/products', roles: ['OPERATOR', 'MANAGER', 'ADMIN'] },
  { metodo: 'POST', ruta: '/products', roles: ['ADMIN'] },
  { metodo: 'PATCH', ruta: `/products/${FOREIGN_ID}`, roles: ['ADMIN'] },
  { metodo: 'GET', ruta: '/users', roles: ['ADMIN'] },
  { metodo: 'PATCH', ruta: `/users/${FOREIGN_ID}`, roles: ['ADMIN'] },
  { metodo: 'GET', ruta: '/invitations', roles: ['ADMIN'] },
  { metodo: 'POST', ruta: '/invitations', roles: ['ADMIN'] },
  { metodo: 'GET', ruta: '/audit-logs', roles: ['ADMIN'] },
];

/** RF-01, 09, 29 y 30: la API aplica la matriz de permisos aunque el front no oculte nada. */
describe('Matriz de permisos', () => {
  const tokens: Partial<Record<Role, string>> = {};

  before(() => {
    (['OPERATOR', 'MANAGER'] as const).forEach((rol) => {
      cy.apiLogin(rol).then((token) => {
        tokens[rol] = token;
      });
    });
  });

  it('Caso 1 - sin token, toda ruta protegida responde 401', () => {
    RUTAS.forEach(({ metodo, ruta }) => {
      cy.api(metodo, ruta).its('status').should('eq', 401);
    });
  });

  it('Caso 2 - un token manipulado responde 401', () => {
    cy.api('GET', '/auth/me', { token: `${tokens.OPERATOR}x` })
      .its('status')
      .should('eq', 401);
  });

  (['OPERATOR', 'MANAGER'] as const).forEach((rol) => {
    it(`Caso 3 - ${rol} recibe 403 en cada ruta que la matriz no le da`, () => {
      RUTAS.filter(({ roles }) => !roles.includes(rol)).forEach(({ metodo, ruta }) => {
        cy.api(metodo, ruta, { token: tokens[rol], body: {} }).its('status').should('eq', 403);
      });
    });
  });
});
