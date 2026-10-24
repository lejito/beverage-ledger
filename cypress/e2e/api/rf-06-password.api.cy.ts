/**
 * RF-06 en la API sobre la cuenta fija de operador, sin cambiarla: el cambio
 * real lo hace la regresión de API del backend sobre el miembro de su corrida.
 */
describe('RF-06 - API de cambio de contraseña', () => {
  let operador = '';

  before(() => {
    cy.apiLogin('OPERATOR').then((token) => {
      operador = token;
    });
  });

  it('Caso 1 (error) - una contraseña nueva que no cumple la política responde 400', () => {
    cy.credentials('OPERATOR').then(({ password }) => {
      cy.api<{ message: string[] }>('PUT', '/users/me/password', {
        token: operador,
        body: { currentPassword: password, newPassword: 'corta' },
      }).then((respuesta) => {
        expect(respuesta.status).to.eq(400);
        expect(respuesta.body.message).to.be.an('array').and.not.be.empty;
      });
    });
  });

  it('Caso 2 (error) - una contraseña actual equivocada responde 400, no 401', () => {
    cy.api('PUT', '/users/me/password', {
      token: operador,
      body: { currentPassword: 'No-Es-La-Mia-2026', newPassword: 'Nueva-Segura-2026x' },
    })
      .its('status')
      .should('eq', 400);
  });

  it('Caso 3 (alternativo) - tras el rechazo la sesión sigue sirviendo', () => {
    cy.api<{ email: string }>('GET', '/auth/me', { token: operador }).then((respuesta) => {
      expect(respuesta.status).to.eq(200);
    });
  });

  it('Caso 4 (error) - sin sesión no se puede cambiar ninguna contraseña', () => {
    cy.api('PUT', '/users/me/password', {
      body: { currentPassword: 'x', newPassword: 'Nueva-Segura-2026x' },
    })
      .its('status')
      .should('eq', 401);
  });
});
