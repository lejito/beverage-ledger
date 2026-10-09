import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/config/navigation';
import { AcceptInviteForm } from '@/features/invitations/AcceptInviteForm';
import { getAccessToken } from '@/lib/api/session';
import { apiError, fakeApi, json } from '@tests/support/fake-api';
import { router } from '@tests/support/navigation';
import { messages, renderScreen, SIGNED_IN_USER } from '@tests/support/render-screen';

const textos = messages.invite;
const TOKEN = 'token-de-invitacion';

const VISTA_PREVIA = {
  email: 'nuevo@beverageledger.test',
  role: 'OPERATOR',
  organizationName: 'Bar de pruebas',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

/** Regresión funcional de RF-03 sobre la pantalla real de aceptar una invitación. */
describe('RF-03 - Pantalla de aceptar invitación', () => {
  it('Caso 1 - una invitación válida muestra la organización, el correo y el rol en español', async () => {
    fakeApi.on('POST /api/v1/invitations/lookup', json(200, VISTA_PREVIA));
    renderScreen(<AcceptInviteForm token={TOKEN} />, null);

    expect(await screen.findByText('Te invitaron a Bar de pruebas')).toBeTruthy();
    expect(screen.getByText(/nuevo@beverageledger\.test.*Operador/)).toBeTruthy();
    expect(fakeApi.callsTo('POST /api/v1/invitations/lookup')[0]?.body).toEqual({ token: TOKEN });
  });

  it('Caso 2 - la política de contraseña está a la vista antes de escribir (heurística 35)', async () => {
    fakeApi.on('POST /api/v1/invitations/lookup', json(200, VISTA_PREVIA));
    renderScreen(<AcceptInviteForm token={TOKEN} />, null);

    expect(await screen.findByText(messages.common.passwordPolicy)).toBeTruthy();
  });

  it('Caso 3 - una contraseña corta se rechaza en el cliente y no llega a la API', async () => {
    fakeApi.on('POST /api/v1/invitations/lookup', json(200, VISTA_PREVIA));
    renderScreen(<AcceptInviteForm token={TOKEN} />, null);
    await screen.findByLabelText(textos.password);

    escribir(textos.name, 'Nuevo Miembro');
    escribir(textos.password, 'Corta1a');
    fireEvent.click(screen.getByRole('button', { name: textos.submit }));

    expect(await screen.findByText('Escribe al menos 12 caracteres.')).toBeTruthy();
    expect(fakeApi.callsTo('POST /api/v1/invitations/accept')).toHaveLength(0);
  });

  it('Caso 4 - aceptar abre la sesión en memoria y entra al tablero', async () => {
    fakeApi.on('POST /api/v1/invitations/lookup', json(200, VISTA_PREVIA));
    fakeApi.on(
      'POST /api/v1/invitations/accept',
      json(201, {
        accessToken: 'jwt-del-invitado',
        expiresIn: 900,
        user: { ...SIGNED_IN_USER, role: 'OPERATOR' },
      }),
    );
    renderScreen(<AcceptInviteForm token={TOKEN} />, null);
    await screen.findByLabelText(textos.password);

    escribir(textos.name, '  Nuevo Miembro  ');
    escribir(textos.password, 'Segura-Nueva-2026');
    fireEvent.click(screen.getByRole('button', { name: textos.submit }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ROUTES.dashboard));
    expect(fakeApi.callsTo('POST /api/v1/invitations/accept')[0]?.body).toEqual({
      token: TOKEN,
      name: 'Nuevo Miembro',
      password: 'Segura-Nueva-2026',
    });
    expect(getAccessToken()).toBe('jwt-del-invitado');
  });

  it('Caso 5 - una invitación gastada o revocada explica qué pasó y ofrece volver al login', async () => {
    fakeApi.on('POST /api/v1/invitations/lookup', apiError(404, 'This invitation cannot be used'));
    renderScreen(<AcceptInviteForm token={TOKEN} />, null);

    expect(await screen.findByText(textos.invalidTitle)).toBeTruthy();
    expect(screen.getByRole('link', { name: textos.backToSignIn }).getAttribute('href')).toBe(
      ROUTES.signIn,
    );
  });
});
