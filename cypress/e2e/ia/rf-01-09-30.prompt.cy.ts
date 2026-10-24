import { AFTER_THROTTLED_CALL, CI_PRODUCT_NAME, messages } from '@cy/support/commands';

/**
 * cy.prompt: the interaction is written in natural language and Cypress Cloud
 * turns it into commands, caching them until the page changes. The steps are in
 * English, the language it is tuned for, quoting the Spanish copy on screen. The
 * verdict never comes from the model: every case ends in exact assertions.
 * Credentials travel as placeholders, which are kept out of the AI calls.
 */
describe('IA · cy.prompt sobre RF-01, RF-09 y RF-30', () => {
  it('RF-01 (error) - un intento con credenciales inexistentes queda en /login con el rechazo', () => {
    // The prompt loads the page and signs in: each call takes its slot first.
    cy.takeAuthSlots('auth/refresh', 'auth/login');
    cy.prompt([
      'visit /login',
      `type "nadie+prompt@beverageledger.test" in the "${messages.auth.fields.email}" field`,
      `type "NoExiste-2026" in the "${messages.auth.fields.password}" field`,
      `click the "${messages.auth.signIn.submit}" button`,
    ]);

    cy.get('form [role="alert"]', AFTER_THROTTLED_CALL).should(
      'contain',
      'Invalid email or password',
    );
    cy.location('pathname').should('eq', '/login');
  });

  it('RF-01 (exitoso) - un operador entra y no ve la administración', () => {
    cy.takeAuthSlots('auth/refresh', 'auth/login');
    cy.credentials('OPERATOR').then(({ email, password }) => {
      cy.prompt(
        [
          'visit /login',
          `type {{email}} in the "${messages.auth.fields.email}" field`,
          `type {{password}} in the "${messages.auth.fields.password}" field`,
          `click the "${messages.auth.signIn.submit}" button`,
        ],
        { placeholders: { email, password } },
      );
    });

    cy.location('pathname', AFTER_THROTTLED_CALL).should('eq', '/dashboard');
    cy.findByRole('link', { name: messages.nav.items.admin }).should('not.exist');
  });

  it('RF-09 (exitoso) - la administradora encuentra el producto de CI en el catálogo', () => {
    cy.signIn('ADMIN');
    cy.prompt([
      `click the "${messages.nav.items.catalog}" link in the navigation`,
      `type "${CI_PRODUCT_NAME}" in the "${messages.catalog.filters.searchLabel}" search box`,
    ]);

    cy.location('pathname').should('eq', '/catalog');
    cy.contains('tr:visible', CI_PRODUCT_NAME, { timeout: 30_000 }).should('have.length', 1);
  });

  it('RF-30 (alternativo) - filtrar el log por productos muestra solo acciones de productos', () => {
    cy.signIn('ADMIN');
    cy.navigateInApp('/admin/audit');
    cy.prompt([
      `click the "${messages.admin.audit.entityLabel}" dropdown`,
      `select the "${messages.admin.audit.entities.product}" option`,
    ]);

    cy.findAllByText(messages.admin.audit.actionNames.product.updated, {
      timeout: 30_000,
    }).should('have.length.greaterThan', 0);
    cy.findAllByText(messages.admin.audit.actionNames.user['signed-in']).should('not.exist');
  });
});
