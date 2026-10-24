import { AFTER_THROTTLED_CALL, messages } from '@cy/support/commands';

const textos = messages.profile.password;

/**
 * RF-06 sobre la cuenta fija de operador, sin cambiarla nunca: cada intento se
 * rechaza. El cambio real lo hace el escenario de Screenplay sobre el miembro
 * que crea su corrida.
 */
describe('RF-06 - Cambio de contraseña', { testIsolation: false }, () => {
  before(() => {
    cy.clearAllCookies();
    cy.signIn('OPERATOR');
    cy.navigateInApp('/profile');
  });

  it('Caso 1 (exitoso) - la política y la advertencia de cierre de sesiones están a la vista', () => {
    cy.findAllByText(messages.common.passwordPolicy).first().should('be.visible');
    cy.findByText(textos.warning).should('be.visible');
  });

  it('Caso 2 (alternativo) - una confirmación distinta se señala sin llamar a la API', () => {
    cy.intercept('PUT', '**/users/me/password').as('cambio');
    cy.findByLabelText(textos.current).type('Cualquiera-2026');
    cy.findByLabelText(textos.new).type('Nueva-Segura-2026');
    cy.findByLabelText(textos.repeat).type('Otra-Distinta-2026');
    cy.findByRole('button', { name: textos.submit }).click();

    cy.findByText(messages.common.validation.mismatch).should('be.visible');
    cy.get('@cambio.all').should('have.length', 0);
  });

  it('Caso 3 (error) - una contraseña actual incorrecta se rechaza y la sesión sigue abierta', () => {
    cy.findByLabelText(textos.repeat).clear().type('Nueva-Segura-2026');
    cy.findByRole('button', { name: textos.submit }).click();

    cy.findByText(textos.changeFailed, AFTER_THROTTLED_CALL).should('be.visible');
    cy.location('pathname').should('eq', '/profile');
  });
});
