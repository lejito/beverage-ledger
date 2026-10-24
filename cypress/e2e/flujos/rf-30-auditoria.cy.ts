import { messages } from '@cy/support/commands';

const textos = messages.admin.audit;

/**
 * RF-30. Corre después de RF-09 (Cypress ordena los specs por nombre), cuya
 * edición del producto de CI tiene que aparecer aquí.
 */
describe('RF-30 - Log de auditoría', { testIsolation: false }, () => {
  before(() => {
    cy.clearAllCookies();
    cy.signIn('ADMIN');
    cy.navigateInApp('/admin/audit');
  });

  it('Caso 1 (exitoso) - el log muestra quién, qué y cuándo', () => {
    cy.findByRole('heading', { name: textos.title }).should('be.visible');
    cy.findByRole('columnheader', { name: textos.columns.who }).should('be.visible');
    cy.findByRole('columnheader', { name: textos.columns.when }).should('be.visible');
    cy.findAllByRole('row').should('have.length.greaterThan', 1);
  });

  it('Caso 2 (alternativo) - filtrar por productos muestra la edición del producto de CI', () => {
    cy.findByRole('combobox', { name: textos.entityLabel }).click();
    cy.findByRole('option', { name: textos.entities.product }).click();

    cy.findAllByText(textos.actionNames.product.updated, { timeout: 30_000 }).should(
      'have.length.greaterThan',
      0,
    );
    cy.findAllByText(textos.actionNames.user['signed-in']).should('not.exist');
  });
});

describe('RF-30 - Acceso al log', () => {
  it('Caso 3 (error) - un manager no tiene el log de auditoría a su alcance', () => {
    cy.signIn('MANAGER');
    cy.navigateInApp('/admin/audit');

    cy.findByText(messages.auth.permissionGate.title).should('be.visible');
    cy.findByRole('columnheader', { name: textos.columns.who }).should('not.exist');
  });
});
