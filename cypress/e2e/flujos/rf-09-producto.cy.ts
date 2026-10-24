import { CI_PRODUCT_NAME, messages } from '@cy/support/commands';

const textos = messages.catalog;
const fila = () => cy.contains('tr:visible', CI_PRODUCT_NAME, { timeout: 30_000 });

const abrirLaEdicion = () => {
  fila().within(() => cy.findByRole('button', { name: messages.common.actions.edit }).click());
  return cy.findByRole('dialog');
};

/** RF-09 sobre el producto fijo de CI, que se deja como estaba. */
describe('RF-09 - Gestión de productos', { testIsolation: false }, () => {
  before(() => {
    cy.clearAllCookies();
    cy.signIn('ADMIN');
    cy.navigateInApp('/catalog');
  });

  it('Caso 1 (exitoso) - la búsqueda encuentra el producto por su nombre', () => {
    cy.findByRole('searchbox', { name: textos.filters.searchLabel }).type(CI_PRODUCT_NAME);

    fila().should('have.length', 1);
  });

  it('Caso 2 (alternativo) - desactivar pide confirmación, y cancelar lo deja activo', () => {
    fila().within(() => cy.findByRole('button', { name: textos.deactivate }).click());
    cy.findByRole('dialog').within(() => {
      cy.findByText(`¿Desactivar ${CI_PRODUCT_NAME}?`).should('be.visible');
      cy.findByRole('button', { name: messages.common.actions.cancel }).click();
    });

    fila().should('contain', textos.active);
  });

  it('Caso 3 (error) - una existencia mínima negativa se señala y no se guarda', () => {
    cy.intercept('PATCH', '**/products/*').as('guardar');
    abrirLaEdicion().within(() => {
      cy.findByLabelText(textos.form.minimumStock).clear().type('-1');
      cy.findByRole('button', { name: messages.common.actions.save }).click();
      cy.findByText(messages.common.validation.min.replace('{min}', '0')).should('be.visible');
      cy.findByRole('button', { name: messages.common.actions.cancel }).click();
    });
    cy.findByRole('dialog').should('not.exist');
    cy.get('@guardar.all').should('have.length', 0);
  });

  // Regresión de DEF-01: el diálogo seguía montado al cancelar y se reabría con
  // lo escrito, aquí el -1 del caso anterior, en vez del valor guardado.
  it('Caso 3b (alternativo) - reabrir tras cancelar muestra lo guardado, no lo escrito', () => {
    abrirLaEdicion().within(() => {
      cy.findByLabelText(textos.form.minimumStock).should('not.have.value', '-1');
      cy.findByRole('button', { name: messages.common.actions.cancel }).click();
    });
    cy.findByRole('dialog').should('not.exist');
  });

  it('Caso 4 (exitoso) - editar la existencia mínima se guarda, se anuncia y se restaura', () => {
    const guardar = (valor: string) => {
      cy.findByLabelText(textos.form.minimumStock).clear().type(valor);
      cy.findByRole('button', { name: messages.common.actions.save }).click();
    };

    abrirLaEdicion().within(() => {
      cy.findByLabelText(textos.form.minimumStock)
        .invoke('val')
        .then((valor) => {
          const original = String(valor);
          // Always a different value, so the row check below cannot pass by itself.
          const nuevo = original === '37' ? '38' : '37';
          cy.wrap({ original, nuevo }).as('valores');
          guardar(nuevo);
        });
    });
    cy.findByRole('dialog').should('not.exist');
    cy.findAllByText(textos.form.updatedTitle).should('have.length.greaterThan', 0);

    cy.get<{ original: string; nuevo: string }>('@valores').then(({ original, nuevo }) => {
      fila().should('contain', nuevo);
      abrirLaEdicion().within(() => guardar(original || '0'));
      cy.findByRole('dialog').should('not.exist');
      fila().should('not.contain', nuevo);
    });
  });

  it('Caso 5 (alternativo) - una búsqueda sin coincidencias lo dice en vez de dejar la tabla vacía', () => {
    cy.findByRole('searchbox', { name: textos.filters.searchLabel })
      .clear()
      .type('zzz-no-existe-cypress');

    cy.findByText(textos.empty, { timeout: 30_000 }).should('be.visible');
  });
});
