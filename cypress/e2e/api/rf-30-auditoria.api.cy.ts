interface Entrada {
  action: string;
  entity: string;
  createdAt: string;
  user: { email: string } | null;
}

/** RF-30 en la API: el log se filtra en el servidor y valida sus filtros. */
describe('RF-30 - API del log de auditoría', () => {
  let admin = '';

  before(() => {
    cy.apiLogin('ADMIN').then((token) => {
      admin = token;
    });
  });

  it('Caso 1 (exitoso) - filtrar por entidad devuelve solo esa entidad', () => {
    cy.api<{ data: Entrada[] }>('GET', '/audit-logs?entity=product&pageSize=20', {
      token: admin,
    }).then((respuesta) => {
      expect(respuesta.status).to.eq(200);
      respuesta.body.data.forEach((entrada) => expect(entrada.entity).to.eq('product'));
    });
  });

  it('Caso 2 (alternativo) - un inicio de sesión queda registrado con su autor', () => {
    cy.credentials('ADMIN').then(({ email }) => {
      cy.api<{ data: Entrada[] }>('GET', '/audit-logs?action=user.signed-in&pageSize=50', {
        token: admin,
      }).then((respuesta) => {
        expect(respuesta.status).to.eq(200);
        const propias = respuesta.body.data.filter((entrada) => entrada.user?.email === email);
        expect(propias, 'inicios de sesión de la administradora').not.to.be.empty;
      });
    });
  });

  it('Caso 3 (alternativo) - un rango de fechas futuro no devuelve entradas', () => {
    cy.api<{ data: Entrada[] }>('GET', '/audit-logs?from=2099-01-01&to=2099-01-31', {
      token: admin,
    }).then((respuesta) => {
      expect(respuesta.status).to.eq(200);
      expect(respuesta.body.data).to.be.empty;
    });
  });

  it('Caso 4 (error) - un valor fuera del enum en el filtro responde 400', () => {
    cy.api('GET', '/audit-logs?entity=planeta', { token: admin }).its('status').should('eq', 400);
  });
});
