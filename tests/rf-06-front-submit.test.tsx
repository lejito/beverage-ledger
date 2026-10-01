import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm';
import messages from '@/i18n/messages/es.json';
import { ApiError } from '@/lib/api';

const { mutateAsync, signOut, notify } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  signOut: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@/features/profile/api', () => ({
  useChangePassword: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('@/features/auth', () => ({ useAuth: () => ({ signOut }) }));

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useNotify: () => notify,
}));

const textos = messages.profile.password;

const conTraducciones = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
    {children}
  </NextIntlClientProvider>
);

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

const enviar = () => {
  escribir(textos.current, 'SecurePass123!');
  escribir(textos.new, 'NuevaSegura123!abc');
  escribir(textos.repeat, 'NuevaSegura123!abc');
  fireEvent.click(screen.getByRole('button', { name: textos.submit }));
};

describe('submit (ChangePasswordForm) - Front', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    render(<ChangePasswordForm />, { wrapper: conTraducciones });
  });

  it('Camino 1 - la mutacion falla y se notifica error', async () => {
    // Arrange
    mutateAsync.mockRejectedValue(
      new ApiError(401, {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'The current password is incorrect',
        path: '/api/v1/users/me/password',
        timestamp: '',
      }),
    );

    // Act
    enviar();

    // Assert
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'error',
        textos.changeFailed,
        'The current password is incorrect',
      ),
    );
    expect(signOut).not.toHaveBeenCalled();
    expect((screen.getByLabelText(textos.new) as HTMLInputElement).value).toBe(
      'NuevaSegura123!abc',
    );
  });

  it('Camino 2 - cambio exitoso, se notifica y se cierra la sesion', async () => {
    // Arrange
    mutateAsync.mockResolvedValue(undefined);

    // Act
    enviar();

    // Assert
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      currentPassword: 'SecurePass123!',
      newPassword: 'NuevaSegura123!abc',
    });
    expect(notify).toHaveBeenCalledWith('success', textos.changedTitle, textos.changedDescription);
    expect((screen.getByLabelText(textos.new) as HTMLInputElement).value).toBe('');
  });
});
