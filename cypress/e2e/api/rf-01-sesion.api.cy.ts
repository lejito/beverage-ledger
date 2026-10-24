/** RF-01 en la API: el contrato de la sesión, sus permisos y la forma de un rechazo. */
describe('RF-01 - API de inicio de sesión', () => {
  it('Caso 1 (exitoso) - un login correcto responde 200 con token y el rol del miembro', () => {
    cy.credentials('OPERATOR').then((credenciales) => {
      cy.takeAuthSlots('auth/login');
      cy.api<{ accessToken: string; user: { email: string; role: string } }>(
        'POST',
        '/auth/login',
        { body: credenciales },
      ).then((respuesta) => {
        expect(respuesta.status).to.eq(200);
        expect(respuesta.body.accessToken).to.be.a('string').and.not.be.empty;
        expect(respuesta.body.user.email).to.eq(credenciales.email);
        expect(respuesta.body.user.role).to.eq('OPERATOR');
      });
    });
  });

  it('Caso 2 (alternativo) - /auth/me devuelve los permisos del operador y ninguno de admin', () => {
    cy.apiLogin('OPERATOR').then((token) => {
      cy.api<{ permissions: string[] }>('GET', '/auth/me', { token }).then((respuesta) => {
        expect(respuesta.status).to.eq(200);
        expect(respuesta.body.permissions).to.include('movement:read');
        expect(respuesta.body.permissions).not.to.include('user:manage');
        expect(respuesta.body.permissions).not.to.include('audit:read');
      });
    });
  });

  it('Caso 3 (error) - un login rechazado responde 401 con la forma uniforme del filtro', () => {
    cy.takeAuthSlots('auth/login');
    cy.api<Record<string, unknown>>('POST', '/auth/login', {
      body: { email: 'nadie+cypress@beverageledger.test', password: 'NoExiste-2026' },
    }).then((respuesta) => {
      expect(respuesta.status).to.eq(401);
      expect(Object.keys(respuesta.body).sort()).to.deep.eq([
        'code',
        'error',
        'message',
        'path',
        'statusCode',
        'timestamp',
      ]);
      expect(respuesta.body.message).to.eq('Invalid email or password');
    });
  });
});
