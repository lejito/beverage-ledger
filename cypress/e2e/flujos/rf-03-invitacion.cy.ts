import { AFTER_THROTTLED_CALL, messages } from '@cy/support/commands';

const textos = messages.admin.invitations;

/** Without the session, the next visit is the invited person's first one. */
const forgetTheSession = () => {
  cy.clearAllCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
};

/**
 * RF-03 sin crear a nadie: la administradora emite una invitación, el invitado
 * ve su vista previa y la invitación se cancela antes de usarse. Aceptarla, que
 * crea un miembro, es el escenario de Screenplay.
 */
describe('RF-03 - Invitaciones', { testIsolation: false }, () => {
  const email = `ci-cypress+${Date.now()}@beverageledger.test`;
  let ruta = '';

  before(() => {
    forgetTheSession();
    cy.signIn('ADMIN');
  });

  it('Caso 1 (exitoso) - emitir una invitación entrega un enlace de un solo uso', () => {
    cy.navigateInApp('/admin/users');
    cy.findAllByRole('button', { name: messages.admin.users.new }).first().click();

    cy.findByRole('dialog').within(() => {
      cy.findByLabelText(textos.form.email).type(email);
      cy.findByRole('button', { name: textos.form.submit }).click();
      cy.findByLabelText(textos.form.link)
        .should('be.visible')
        .invoke('val')
        .should('match', /\/invite\/[\w-]+$/)
        .then((enlace) => {
          ruta = new URL(String(enlace)).pathname;
        });
      cy.findByText(textos.form.linkHint).should('be.visible');
    });
    cy.get('body').type('{esc}');
  });

  it('Caso 2 (alternativo) - quien abre el enlace ve con qué correo entra y la política', () => {
    forgetTheSession();
    cy.visit(ruta);

    // The address is part of a sentence, not an element of its own.
    cy.contains('p', email, AFTER_THROTTLED_CALL).should('be.visible');
    cy.findByText(messages.common.passwordPolicy).should('be.visible');
  });

  it('Caso 3 (error) - una invitación cancelada deja el enlace inservible', () => {
    cy.signIn('ADMIN');
    cy.navigateInApp('/admin/users');
    cy.contains('tr:visible', email, AFTER_THROTTLED_CALL).within(() => {
      cy.findByRole('button', { name: textos.revoke }).click();
    });
    cy.findByRole('dialog').within(() => {
      cy.findByText(textos.revokeDescription).should('be.visible');
      cy.findByRole('button', { name: textos.revokeConfirm }).click();
    });
    cy.findAllByText(textos.revoked).should('have.length.greaterThan', 0);

    forgetTheSession();
    cy.visit(ruta);
    cy.findByText(messages.invite.invalidTitle, AFTER_THROTTLED_CALL).should('be.visible');
  });
});
