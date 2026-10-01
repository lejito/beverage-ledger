import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUpdateUser, useUsers } from '@/features/admin/api';
import { ASSIGNABLE_ROLES, ASSIGNABLE_STATUSES, STATUS_TONES } from '@/features/admin/roles';
import { describeError } from '@/lib/api';

const { cliente } = vi.hoisted(() => ({ cliente: { GET: vi.fn(), PATCH: vi.fn() } }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

const exito = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

const conCliente = (client: QueryClient) =>
  function Proveedor({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };

/**
 * Regresión de RF-29 en el cliente: qué ofrece la pantalla de usuarios y cómo
 * los hooks reales hablan con la API simulada.
 */
describe('RF-29 Frontend - Regresión de la administración de usuarios', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('Camino 1 - el selector de rol nunca ofrece PLATFORM_ADMIN', () => {
    // Assert
    expect(ASSIGNABLE_ROLES).toEqual(['OPERATOR', 'MANAGER', 'ORG_ADMIN']);
    expect(ASSIGNABLE_ROLES).not.toContain('PLATFORM_ADMIN');
  });

  it('Camino 2 - el selector de estado no ofrece INVITED: ese estado solo lo da una invitación', () => {
    // Assert
    expect(ASSIGNABLE_STATUSES).toEqual(['ACTIVE', 'SUSPENDED']);
  });

  it('Camino 3 - una cuenta suspendida se marca como peligro', () => {
    // Assert
    expect(STATUS_TONES.SUSPENDED).toBe('danger');
    expect(STATUS_TONES.ACTIVE).toBe('success');
  });

  it('Camino 4 - el listado pide la página al servidor', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ data: [], meta: { page: 2, pageCount: 2 } }));

    // Act
    const { result } = renderHook(() => useUsers({ page: 2, pageSize: 25 }), {
      wrapper: conCliente(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/users', {
      params: { query: { page: 2, pageSize: 25 } },
    });
  });

  it('Camino 5 - sin permiso, el listado no sale a la red', () => {
    // Act
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 25 }, false), {
      wrapper: conCliente(client),
    });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
    expect(cliente.GET).not.toHaveBeenCalled();
  });

  it('Camino 6 - suspender manda el id en la ruta e invalida todas las páginas', async () => {
    // Arrange
    cliente.PATCH.mockResolvedValue(exito({ id: 'user-2', status: 'SUSPENDED' }));
    client.setQueryData(['users', { page: 3, pageSize: 25 }], { data: [] });
    const { result } = renderHook(() => useUpdateUser(), { wrapper: conCliente(client) });

    // Act
    await result.current.mutateAsync({ id: 'user-2', input: { status: 'SUSPENDED' } });

    // Assert
    expect(cliente.PATCH).toHaveBeenCalledWith('/api/v1/users/{id}', {
      params: { path: { id: 'user-2' } },
      body: { status: 'SUSPENDED' },
    });
    expect(client.getQueryState(['users', { page: 3, pageSize: 25 }])?.isInvalidated).toBe(true);
  });

  it('Camino 7 - degradar al último admin muestra el motivo que da la API', async () => {
    // Arrange
    const motivo = 'The organization must keep at least one active administrator';
    cliente.PATCH.mockResolvedValue({
      error: {
        statusCode: 400,
        error: 'Bad Request',
        message: motivo,
        path: '/api/v1/users/admin-1',
        timestamp: '',
      },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useUpdateUser(), { wrapper: conCliente(client) });

    // Act
    const error = await result.current
      .mutateAsync({ id: 'admin-1', input: { role: 'MANAGER' } })
      .catch((causa: unknown) => causa);

    // Assert
    expect(describeError(error, 'respaldo')).toBe(motivo);
  });
});
