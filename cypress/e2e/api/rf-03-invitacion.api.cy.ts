interface Emitida {
  acceptUrl: string;
  invitation: { id: string; email: string };
}

const consultar = (token: string) => {
  cy.takeAuthSlots('invitations/lookup');
  return cy.api<{ email: string; role: string }>('POST', '/invitations/lookup', {
    body: { token },
  });
};

/** RF-03 en la API sin crear a nadie: se emite, se previsualiza y se revoca. */
describe('RF-03 - API de invitaciones', () => {
  const email = `ci-cypress-api+${Date.now()}@beverageledger.test`;
  let admin = '';
  let emitida: Emitida;

  before(() => {
    cy.apiLogin('ADMIN').then((token) => {
      admin = token;
    });
  });

  it('Caso 1 (exitoso) - emitir responde 201 con un enlace que se puede previsualizar', () => {
    cy.api<Emitida>('POST', '/invitations', {
      token: admin,
      body: { email, role: 'OPERATOR' },
    }).then((respuesta) => {
      expect(respuesta.status).to.eq(201);
      expect(respuesta.body.invitation.email).to.eq(email);
      expect(respuesta.body.acceptUrl).to.match(/\/invite\/[\w-]+$/);
      emitida = respuesta.body;

      consultar(new URL(emitida.acceptUrl).pathname.split('/').pop()!).then((vista) => {
        expect(vista.status).to.eq(200);
        expect(vista.body.email).to.eq(email);
        expect(vista.body.role).to.eq('OPERATOR');
      });
    });
  });

  it('Caso 2 (alternativo) - el listado la muestra pendiente: ni aceptada ni revocada', () => {
    cy.api<{ data: { id: string; acceptedAt: string | null; revokedAt: string | null }[] }>(
      'GET',
      '/invitations?pageSize=100',
      { token: admin },
    ).then((respuesta) => {
      expect(respuesta.status).to.eq(200);
      const listada = respuesta.body.data.find(({ id }) => id === emitida.invitation.id);
      expect(listada, 'la invitación emitida').to.exist;
      expect(listada!.acceptedAt).to.be.null;
      expect(listada!.revokedAt).to.be.null;
    });
  });

  it('Caso 3 (error) - revocada, el enlace deja de existir y revocarla otra vez responde 409', () => {
    cy.api('DELETE', `/invitations/${emitida.invitation.id}`, { token: admin }).then((revocar) => {
      expect(revocar.status).to.eq(204);
    });
    consultar(new URL(emitida.acceptUrl).pathname.split('/').pop()!)
      .its('status')
      .should('eq', 404);
    cy.api('DELETE', `/invitations/${emitida.invitation.id}`, { token: admin })
      .its('status')
      .should('eq', 409);
  });

  it('Caso 4 (error) - un token inventado no revela nada y responde 404', () => {
    consultar('token-que-no-existe-cypress').its('status').should('eq', 404);
  });
});
