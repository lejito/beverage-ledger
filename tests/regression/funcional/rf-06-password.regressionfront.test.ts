import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChangePassword, useUpdateProfile } from '@/features/profile/api';
import { ApiError, describeError } from '@/lib/api';
import { rules } from '@/lib/forms';

const { cliente } = vi.hoisted(() => ({ cliente: { PUT: vi.fn(), PATCH: vi.fn() } }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

const conCliente = (client: QueryClient) =>
  function Proveedor({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };

/**
 * Regresión de RF-06 en el cliente: el hook real de cambio de contraseña con la
 * API simulada, y las reglas que el formulario aplica antes de enviar.
 */
describe('RF-06 Frontend - Regresión del cambio de contraseña', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });

  it('Camino 1 - envía la contraseña actual y la nueva a la ruta propia', async () => {
    // Arrange
    cliente.PUT.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    const { result } = renderHook(() => useChangePassword(), { wrapper: conCliente(client) });
    const entrada = { currentPassword: 'Actual2026abc', newPassword: 'Nueva2026abcd' };

    // Act
    await result.current.mutateAsync(entrada);

    // Assert
    expect(cliente.PUT).toHaveBeenCalledWith('/api/v1/users/me/password', { body: entrada });
  });

  it('Camino 2 - un 204 sin cuerpo cuenta como éxito', async () => {
    // Arrange
    cliente.PUT.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    const { result } = renderHook(() => useChangePassword(), { wrapper: conCliente(client) });

    // Act
    const cambio = result.current.mutateAsync({
      currentPassword: 'Actual2026abc',
      newPassword: 'Nueva2026abcd',
    });

    // Assert
    await expect(cambio).resolves.toBeUndefined();
  });

  it('Camino 3 - una contraseña actual errónea llega con el mensaje de la API', async () => {
    // Arrange
    cliente.PUT.mockResolvedValue({
      error: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'The current password is incorrect',
        path: '/api/v1/users/me/password',
        timestamp: '',
      },
      response: new Response(null, { status: 401 }),
    });
    const { result } = renderHook(() => useChangePassword(), { wrapper: conCliente(client) });

    // Act
    const error = await result.current
      .mutateAsync({ currentPassword: 'Errada2026abc', newPassword: 'Nueva2026abcd' })
      .catch((causa: unknown) => causa);

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect(describeError(error, 'respaldo')).toBe('The current password is incorrect');
  });

  it('Camino 4 - editar el perfil refresca la sesión que muestra la barra superior', async () => {
    // Arrange
    cliente.PATCH.mockResolvedValue({
      data: { id: 'user-1', name: 'Ana R.' },
      response: new Response(null, { status: 200 }),
    });
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: conCliente(client) });

    // Act
    await result.current.mutateAsync({ name: 'Ana R.' });

    // Assert
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['session'] });
  });

  it('Camino 5 - la nueva contraseña exige 12 caracteres', () => {
    // Act
    const corta = rules.secret('Nueva2026ab', { minLength: 12 });
    const justa = rules.secret('Nueva2026abc', { minLength: 12 });

    // Assert
    expect(corta).toEqual({ kind: 'minLength', count: 12 });
    expect(justa).toBeUndefined();
  });

  it('Camino 6 - la confirmación tiene que coincidir exactamente', () => {
    // Act
    const distinta = rules.matches('Nueva2026abcd ', 'Nueva2026abcd');
    const vacia = rules.matches('', 'Nueva2026abcd');
    const igual = rules.matches('Nueva2026abcd', 'Nueva2026abcd');

    // Assert
    expect(distinta).toEqual({ kind: 'mismatch' });
    expect(vacia).toEqual({ kind: 'required' });
    expect(igual).toBeUndefined();
  });

  it('Camino 7 - la contraseña actual es obligatoria', () => {
    // Act
    const problema = rules.secret('');

    // Assert
    expect(problema).toEqual({ kind: 'required' });
  });
});
