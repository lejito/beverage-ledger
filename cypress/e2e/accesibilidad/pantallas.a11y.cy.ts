import { messages } from '@cy/support/commands';

/**
 * WCAG 2.1 AA con axe sobre las pantallas de RF-01, 03, 06, 09, 29 y 30, con
 * las tablas ya cargadas: así encontró los defectos DEF-02 a DEF-04, que la
 * heurística de Playwright, que evalúa antes de que lleguen las filas, no veía.
 * La evaluación automática no sustituye la revisión manual de la heurística.
 */
describe('Accesibilidad de las pantallas', { testIsolation: false }, () => {
  it('Caso 1 - el inicio de sesión (RF-01) no tiene barreras graves', () => {
    cy.clearAllCookies();
    cy.visit('/login');
    cy.waitForHydration();
    cy.expectAccessible();
  });

  it('Caso 2 - un enlace de invitación inservible (RF-03) se explica sin barreras', () => {
    cy.visit('/invite/token-que-no-existe');
    cy.findByText(messages.invite.invalidTitle, { timeout: 90_000 }).should('be.visible');
    cy.expectAccessible();
  });

  (
    [
      ['Caso 3 - el panel', '/dashboard'],
      ['Caso 4 - el perfil y el cambio de contraseña (RF-06)', '/profile'],
      ['Caso 5 - el catálogo (RF-09)', '/catalog'],
      ['Caso 6 - los usuarios e invitaciones (RF-29, RF-03)', '/admin/users'],
      ['Caso 7 - el log de auditoría (RF-30)', '/admin/audit'],
    ] as const
  ).forEach(([nombre, ruta], indice) => {
    it(`${nombre} no tiene barreras graves`, () => {
      if (indice === 0) cy.signIn('ADMIN');
      else cy.navigateInApp(ruta);
      cy.get('[aria-busy="true"]', { timeout: 30_000 }).should('not.exist');
      cy.expectAccessible();
    });
  });
});
