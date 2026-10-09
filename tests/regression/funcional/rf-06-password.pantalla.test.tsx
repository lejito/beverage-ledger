import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/config/navigation';
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm';
import { apiError, fakeApi, json } from '@tests/support/fake-api';
import { router } from '@tests/support/navigation';
import { messages, renderScreen } from '@tests/support/render-screen';

const textos = messages.profile.password;

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

async function llenar(actual: string, nueva: string, repetida = nueva) {
  await screen.findByLabelText(textos.current);
  escribir(textos.current, actual);
  escribir(textos.new, nueva);
  escribir(textos.repeat, repetida);
  fireEvent.click(screen.getByRole('button', { name: textos.submit }));
}

/** Regresión funcional de RF-06 sobre la pantalla real del cambio de contraseña. */
describe('RF-06 - Pantalla de cambio de contraseña', () => {
  it('Caso 1 - la advertencia de que se cierran todas las sesiones está a la vista', async () => {
    renderScreen(<ChangePasswordForm />, 'OPERATOR');

    expect(await screen.findByText(textos.warning)).toBeTruthy();
    expect(screen.getByText(messages.common.passwordPolicy)).toBeTruthy();
  });

  it('Caso 2 - una confirmación distinta bloquea el envío', async () => {
    renderScreen(<ChangePasswordForm />, 'OPERATOR');

    await llenar('Actual-Segura-2026', 'Nueva-Segura-2026', 'Nueva-Segura-2027');

    expect(await screen.findByText(messages.common.validation.mismatch)).toBeTruthy();
    expect(fakeApi.callsTo('PUT /api/v1/users/me/password')).toHaveLength(0);
  });

  it('Caso 3 - una contraseña actual incorrecta avisa y conserva lo escrito', async () => {
    fakeApi.on('PUT /api/v1/users/me/password', apiError(401, 'The current password is incorrect'));
    renderScreen(<ChangePasswordForm />, 'OPERATOR');

    await llenar('Equivocada-2026', 'Nueva-Segura-2026');

    expect(await screen.findByText(textos.changeFailed)).toBeTruthy();
    expect(screen.getByText('The current password is incorrect')).toBeTruthy();
    expect((screen.getByLabelText(textos.new) as HTMLInputElement).value).toBe('Nueva-Segura-2026');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('Caso 4 - un cambio correcto confirma, cierra la sesión y lleva al login', async () => {
    fakeApi.on('PUT /api/v1/users/me/password', json(204));
    fakeApi.on('POST /api/v1/auth/logout', json(204));
    renderScreen(<ChangePasswordForm />, 'OPERATOR');

    await llenar('Actual-Segura-2026', 'Nueva-Segura-2026');

    expect(await screen.findByText(textos.changedTitle)).toBeTruthy();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ROUTES.signIn));
    expect(fakeApi.callsTo('PUT /api/v1/users/me/password')[0]?.body).toEqual({
      currentPassword: 'Actual-Segura-2026',
      newPassword: 'Nueva-Segura-2026',
    });
    expect(fakeApi.callsTo('POST /api/v1/auth/logout')).toHaveLength(1);
  });
});
