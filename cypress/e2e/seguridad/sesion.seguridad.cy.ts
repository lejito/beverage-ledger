import { AFTER_THROTTLED_CALL, messages } from '@cy/support/commands';

const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/;

/** RF-01: dónde vive la sesión en el navegador y qué queda de ella al salir. */
describe('Sesión en el navegador', () => {
  it('Caso 1 - el access token vive en memoria: ni localStorage ni sessionStorage lo guardan', () => {
    cy.signIn('OPERATOR');

    cy.window().then((win) => {
      const guardado = [
        ...Object.values(win.localStorage),
        ...Object.values(win.sessionStorage),
      ].join('\n');
      expect(guardado).not.to.match(JWT);
    });
    cy.getCookies().then((cookies) => {
      cookies.forEach(({ value }) => expect(value).not.to.match(JWT));
    });
  });

  // A full load tries the refresh cookie first: landing on /login proves the
  // API revoked it, not only that the page forgot the token.
  it('Caso 2 - cerrar sesión revoca la cookie: una recarga vuelve a pedir credenciales', () => {
    cy.signIn('OPERATOR');
    cy.findAllByRole('button', { name: new RegExp(messages.nav.account.menu) })
      .filter(':visible')
      .first()
      .click();
    cy.findByRole('button', { name: messages.nav.account.signOut }).click();
    cy.location('pathname', AFTER_THROTTLED_CALL).should('eq', '/login');

    cy.visit('/dashboard');
    cy.location('search', AFTER_THROTTLED_CALL).should('eq', '?next=%2Fdashboard');
    cy.findByRole('heading', { name: messages.dashboard.title }).should('not.exist');
  });
});
