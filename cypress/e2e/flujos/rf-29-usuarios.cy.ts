import { messages } from '@cy/support/commands';

const textos = messages.admin.users;

/**
 * The row of a member, on whichever page of the list it is: the deployed
 * database grows with every run, so nothing stays on page one.
 */
const filaDe = (email: string) => {
  const siguiente = () =>
    cy
      .findAllByRole('navigation', { name: messages.common.pagination.label })
      .first()
      .findAllByRole('button', { name: messages.common.pagination.next })
      .filter(':visible');

  const buscar = (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy
      .get('[aria-busy="true"]')
      .should('not.exist')
      .then(() => {
        if (Cypress.$(`tr:visible:contains("${email}")`).length > 0) {
          return cy.contains('tr:visible', email);
        }
        return siguiente().then(($boton) => {
          if ($boton.is(':disabled')) throw new Error(`«${email}» no aparece en ninguna página`);
          cy.wrap($boton).click();
          return buscar();
        });
      });

  cy.findAllByRole('row').should('have.length.greaterThan', 1);
  return buscar();
};

/** RF-29 sin cambiar a nadie: cada acción se cancela. */
describe('RF-29 - Gestión de usuarios', { testIsolation: false }, () => {
  before(() => {
    cy.clearAllCookies();
    cy.signIn('ADMIN');
    cy.navigateInApp('/admin/users');
  });

  it('Caso 1 (exitoso) - la fila propia se marca y no ofrece suspender', () => {
    cy.credentials('ADMIN').then(({ email }) => {
      filaDe(email).within(() => {
        cy.findByText(textos.you).should('be.visible');
        cy.findByRole('button', { name: textos.suspend }).should('not.exist');
      });
    });
  });

  it('Caso 2 (alternativo) - suspender a otro pide confirmación y cancelar no cambia su estado', () => {
    cy.credentials('OPERATOR').then(({ email }) => {
      filaDe(email).within(() => cy.findByRole('button', { name: textos.suspend }).click());
      cy.findByRole('dialog').within(() => {
        cy.findByText(textos.suspendDescription).should('be.visible');
        cy.findByRole('button', { name: messages.common.actions.cancel }).click();
      });
      filaDe(email).should('contain', messages.admin.statuses.ACTIVE);
    });
  });
});

describe('RF-29 - Segregación de funciones', () => {
  it('Caso 3 (error) - un operador que escribe la URL de usuarios ve el aviso de sin permiso', () => {
    cy.signIn('OPERATOR');
    cy.navigateInApp('/admin/users');

    cy.findByText(messages.auth.permissionGate.title).should('be.visible');
    cy.findByRole('table', { name: textos.caption }).should('not.exist');
  });
});
