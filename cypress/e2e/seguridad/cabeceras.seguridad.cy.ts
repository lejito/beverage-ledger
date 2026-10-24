/** Seguridad transversal: lo que la app y la API le piden al navegador. */
describe('Cabeceras de seguridad', () => {
  it('Caso 1 - next start entrega las cabeceras de next.config.ts y no se anuncia', () => {
    cy.request('/login').then(({ headers }) => {
      expect(headers['x-content-type-options']).to.eq('nosniff');
      expect(headers['x-frame-options']).to.eq('DENY');
      expect(headers['referrer-policy']).to.eq('strict-origin-when-cross-origin');
      expect(headers['permissions-policy']).to.contain('camera=()');
      expect(headers).not.to.have.property('x-powered-by');
    });
  });

  it('Caso 2 - la API entrega las cabeceras de Helmet y no se anuncia Express', () => {
    cy.api('GET', '/health').then(({ status, headers }) => {
      expect(status).to.eq(200);
      expect(headers['x-content-type-options']).to.eq('nosniff');
      expect(headers['strict-transport-security']).to.be.a('string');
      expect(headers['content-security-policy']).to.be.a('string');
      expect(headers).not.to.have.property('x-powered-by');
    });
  });

  it('Caso 3 - un origen ajeno no recibe permiso de CORS', () => {
    cy.request({
      method: 'OPTIONS',
      url: `${Cypress.expose('apiUrl') as string}/auth/login`,
      headers: { Origin: 'https://atacante.example', 'Access-Control-Request-Method': 'POST' },
      failOnStatusCode: false,
    }).then(({ headers }) => {
      expect(headers['access-control-allow-origin']).not.to.be.oneOf([
        'https://atacante.example',
        '*',
      ]);
    });
  });

  it('Caso 4 - una ruta inexistente responde 404 sin trazas ni nombres internos', () => {
    cy.api('GET', '/no-existe').then(({ status, body }) => {
      expect(status).to.eq(404);
      expect(JSON.stringify(body)).not.to.match(/stack|prisma|node_modules|at \w+ \(/i);
    });
  });
});
