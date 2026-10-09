import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { UsersView } from '@/features/admin/UsersView';
import { apiError, fakeApi, json } from '@tests/support/fake-api';
import { MEMBER, page } from '@tests/support/pages';
import { messages, renderScreen, SIGNED_IN_USER } from '@tests/support/render-screen';

const textos = messages.admin.users;
const YO = { ...MEMBER, ...SIGNED_IN_USER, role: 'ORG_ADMIN' };

// Until the session resolves, no row is "yours" and every row offers to suspend:
// waiting for the "tú" marker is what makes the buttons the final ones.
const suspender = async () => {
  await screen.findAllByText(textos.you);
  const [boton] = await screen.findAllByRole('button', { name: textos.suspend });
  fireEvent.click(boton!);
  return screen.findByRole('dialog');
};

/** Regresión funcional de RF-29 sobre la pantalla real de usuarios. */
describe('RF-29 - Pantalla de usuarios', () => {
  beforeEach(() => {
    fakeApi.on('GET /api/v1/users', json(200, page([YO, MEMBER])));
    fakeApi.on('GET /api/v1/invitations', json(200, page([])));
  });

  it('Caso 1 - la fila propia no ofrece suspender: nadie se deja fuera a sí mismo', async () => {
    renderScreen(<UsersView />, 'ORG_ADMIN');

    expect((await screen.findAllByText(MEMBER.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textos.you).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: textos.suspend })).toHaveLength(
      screen.getAllByText(MEMBER.email).length,
    );
  });

  it('Caso 2 - suspender pide confirmación y cancelar no cambia nada (heurísticas 30 y 34)', async () => {
    renderScreen(<UsersView />, 'ORG_ADMIN');

    const dialogo = await suspender();
    expect(within(dialogo).getByText(`¿Suspender a ${MEMBER.name}?`)).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: messages.common.actions.cancel }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fakeApi.callsTo(`PATCH /api/v1/users/${MEMBER.id}`)).toHaveLength(0);
  });

  it('Caso 3 - confirmar suspende al miembro y lo anuncia', async () => {
    fakeApi.on(`PATCH /api/v1/users/${MEMBER.id}`, json(200, { ...MEMBER, status: 'SUSPENDED' }));
    renderScreen(<UsersView />, 'ORG_ADMIN');

    const dialogo = await suspender();
    fireEvent.click(within(dialogo).getByRole('button', { name: textos.suspend }));

    expect(await screen.findByText(textos.suspendedTitle)).toBeTruthy();
    expect(fakeApi.callsTo(`PATCH /api/v1/users/${MEMBER.id}`)[0]?.body).toEqual({
      status: 'SUSPENDED',
    });
  });

  it('Caso 4 - si la API lo impide, se explica por qué', async () => {
    fakeApi.on(
      `PATCH /api/v1/users/${MEMBER.id}`,
      apiError(400, 'The organization must keep at least one active administrator'),
    );
    renderScreen(<UsersView />, 'ORG_ADMIN');

    const dialogo = await suspender();
    fireEvent.click(within(dialogo).getByRole('button', { name: textos.suspend }));

    expect(await screen.findByText(textos.statusFailed)).toBeTruthy();
    expect(
      screen.getByText('The organization must keep at least one active administrator'),
    ).toBeTruthy();
  });

  it('Caso 5 - la lista se pide paginada al servidor', async () => {
    renderScreen(<UsersView />, 'ORG_ADMIN');

    await screen.findAllByText(MEMBER.name);
    const [peticion] = fakeApi.callsTo('GET /api/v1/users');

    expect(peticion?.url.searchParams.get('page')).toBe('1');
    expect(Number(peticion?.url.searchParams.get('pageSize'))).toBeGreaterThan(0);
  });
});
