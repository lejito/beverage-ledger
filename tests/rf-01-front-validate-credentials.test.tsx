import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/AuthForm';
import messages from '@/i18n/messages/es.json';
import { ApiError } from '@/lib/api';

const { signIn, replace, searchParams } = vi.hoisted(() => ({
  signIn: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ signIn }) }));

const conTraducciones = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
    {children}
  </NextIntlClientProvider>
);

const enviar = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(messages.auth.fields.email), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(messages.auth.fields.password), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: messages.auth.signIn.submit }));
};

describe('handleSubmit - Front', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.delete('next');
  });

  it('Camino 1 - signIn lanza excepcion y se muestra el error', async () => {
    // Arrange
    signIn.mockRejectedValue(
      new ApiError(401, {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password',
        path: '/api/v1/auth/login',
        timestamp: '',
      }),
    );
    render(<LoginForm />, { wrapper: conTraducciones });

    // Act
    enviar('no-existe@ejemplo.com', 'contraseña-incorrecta');

    // Assert
    expect(await screen.findByText('Invalid email or password')).toBeDefined();
    expect(signIn).toHaveBeenCalledWith({
      email: 'no-existe@ejemplo.com',
      password: 'contraseña-incorrecta',
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('Camino 2 - signIn tiene exito y vuelve a la pagina que se pidio', async () => {
    // Arrange
    signIn.mockResolvedValue(undefined);
    searchParams.set('next', '/stock');
    render(<LoginForm />, { wrapper: conTraducciones });

    // Act
    enviar('admin@beverageledger.local', 'Inventario2026');

    // Assert
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/stock'));
    expect(signIn).toHaveBeenCalledWith({
      email: 'admin@beverageledger.local',
      password: 'Inventario2026',
    });
    expect(screen.queryByText(messages.auth.signIn.failed)).toBeNull();
  });
});
