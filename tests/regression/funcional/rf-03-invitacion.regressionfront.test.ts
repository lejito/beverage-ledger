import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAcceptInvitation, useInvitationPreview } from '@/features/invitations/api';
import { ApiError } from '@/lib/api';
import { rules } from '@/lib/forms';

const { cliente } = vi.hoisted(() => ({ cliente: { POST: vi.fn() } }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

const exito = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

const fallo = (status: number, message: string) => ({
  error: { statusCode: status, error: 'Error', message, path: '/', timestamp: '' },
  response: new Response(null, { status }),
});

const conCliente = (client: QueryClient) =>
  function Proveedor({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };

/**
 * Regresión de RF-03 en el cliente: los hooks reales de invitación con la API
 * simulada, y las reglas que el formulario aplica antes de enviar.
 */
describe('RF-03 Frontend - Regresión de aceptar una invitación', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default retries on purpose: the preview hook must switch them off itself.
    client = new QueryClient();
  });

  it('Camino 1 - la vista previa manda el token en el body, nunca en la URL', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(exito({ email: 'ana@example.com' }));

    // Act
    const { result } = renderHook(() => useInvitationPreview('tok-123'), {
      wrapper: conCliente(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.POST).toHaveBeenCalledWith('/api/v1/invitations/lookup', {
      body: { token: 'tok-123' },
    });
  });

  it('Camino 2 - un token inútil no se reintenta y llega como ApiError 404', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(fallo(404, 'This invitation link is no longer valid'));

    // Act
    const { result } = renderHook(() => useInvitationPreview('tok-vencido'), {
      wrapper: conCliente(client),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(cliente.POST).toHaveBeenCalledOnce();
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(404);
  });

  it('Camino 3 - aceptar manda token, nombre y contraseña, y devuelve la sesión', async () => {
    // Arrange
    const sesion = { accessToken: 'jwt-1', expiresIn: 900 };
    cliente.POST.mockResolvedValue(exito(sesion));
    const entrada = { token: 'tok-123', name: 'Ana Restrepo', password: 'Inventario2026' };
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: conCliente(client) });

    // Act
    const devuelta = await result.current.mutateAsync(entrada);

    // Assert
    expect(cliente.POST).toHaveBeenCalledWith('/api/v1/invitations/accept', { body: entrada });
    expect(devuelta).toEqual(sesion);
  });

  it('Camino 4 - aceptar invalida invitaciones y usuarios', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(exito({ accessToken: 'jwt-1', expiresIn: 900 }));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: conCliente(client) });

    // Act
    await result.current.mutateAsync({ token: 't', name: 'Ana', password: 'Inventario2026' });

    // Assert
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['invitations'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('Camino 5 - una aceptación rechazada lanza ApiError y no invalida nada', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(fallo(409, 'That email already belongs to a member'));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: conCliente(client) });

    // Act
    const aceptacion = result.current.mutateAsync({
      token: 't',
      name: 'Ana',
      password: 'Inventario2026',
    });

    // Assert
    await expect(aceptacion).rejects.toThrow('That email already belongs to a member');
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('Camino 6 - el nombre se mide sin espacios alrededor', () => {
    // Act
    const problema = rules.text('  A  ', { minLength: 2 });

    // Assert
    expect(problema).toEqual({ kind: 'minLength', count: 2 });
  });

  it('Camino 7 - la contraseña no se recorta: los espacios cuentan', () => {
    // Act
    const conEspacios = rules.secret('  Inventario', { minLength: 12 });
    const vacia = rules.secret('', { minLength: 12 });

    // Assert
    expect(conEspacios).toBeUndefined();
    expect(vacia).toEqual({ kind: 'required' });
  });
});
