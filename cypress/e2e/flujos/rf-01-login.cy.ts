import { AFTER_THROTTLED_CALL, messages } from '@cy/support/commands';

/** RF-01 de punta a punta: el navegador, la app compilada y la API. */
describe('RF-01 - Inicio de sesión', () => {
  it('Caso 1 (error) - credenciales que no existen se rechazan con un mensaje y sin entrar', () => {
    cy.visit('/login');
    cy.waitForHydration();
    cy.findByLabelText(messages.auth.fields.email).type('nadie+cypress@beverageledger.test');
    cy.findByLabelText(messages.auth.fields.password).type('NoExiste-2026');
    cy.submitSignIn();

    cy.get('form [role="alert"]', AFTER_THROTTLED_CALL).should(
      'contain',
      'Invalid email or password',
    );
    cy.location('pathname').should('eq', '/login');
  });

  it('Caso 2 (exitoso) - un operador entra, no ve administración y al salir pierde el acceso', () => {
    cy.signIn('OPERATOR');
    cy.findAllByRole('link', { name: messages.nav.items.dashboard }).should('be.visible');
    cy.findByRole('link', { name: messages.nav.items.admin }).should('not.exist');

    cy.findAllByRole('button', { name: new RegExp(messages.nav.account.menu) })
      .filter(':visible')
      .first()
      .click();
    cy.findByRole('button', { name: messages.nav.account.signOut }).click();
    cy.location('pathname', AFTER_THROTTLED_CALL).should('eq', '/login');

    cy.visit('/admin/users');
    cy.location('search', AFTER_THROTTLED_CALL).should('eq', '?next=%2Fadmin%2Fusers');
  });

  it('Caso 3 (alternativo) - un enlace profundo sin sesión vuelve a su destino al entrar', () => {
    cy.visit('/catalog');
    cy.location('search', AFTER_THROTTLED_CALL).should('eq', '?next=%2Fcatalog');
    cy.waitForHydration();
    cy.credentials('OPERATOR').then(({ email, password }) => {
      cy.findByLabelText(messages.auth.fields.email).type(email);
      cy.findByLabelText(messages.auth.fields.password).type(password, { log: false });
    });
    cy.submitSignIn();

    cy.location('pathname', AFTER_THROTTLED_CALL).should('eq', '/catalog');
    cy.findByRole('heading', { name: messages.catalog.title }).should('be.visible');
  });
});
