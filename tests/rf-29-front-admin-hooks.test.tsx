import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrganization, useUpdateOrganization } from '@/features/admin/api';
import {
  useCreateInvitation,
  useInvitations,
  useRevokeInvitation,
} from '@/features/invitations/api';

const { cliente } = vi.hoisted(() => ({
  cliente: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

const exito = (data: unknown, status = 200) => ({
  data,
  response: new Response(null, { status }),
});

describe('Hooks de invitaciones y organización - Front', () => {
  let client: QueryClient;

  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('Camino 1 - el listado de invitaciones pide la página al servidor', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ data: [], meta: { page: 1, pageCount: 1 } }));

    // Act
    const { result } = renderHook(() => useInvitations({ page: 1, pageSize: 10 }), {
      wrapper: envolver,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/invitations', {
      params: { query: { page: 1, pageSize: 10 } },
    });
  });

  it('Camino 2 - sin permiso, el listado de invitaciones no sale a la red', () => {
    // Act
    const { result } = renderHook(() => useInvitations({ page: 1, pageSize: 10 }, false), {
      wrapper: envolver,
    });

    // Assert
    expect(result.current.fetchStatus).toBe('idle');
    expect(cliente.GET).not.toHaveBeenCalled();
  });

  it('Camino 3 - emitir una invitación la envía y refresca las pendientes', async () => {
    // Arrange
    const emitida = { invitation: { id: 'inv-1' }, acceptUrl: 'https://app/invite/tok' };
    cliente.POST.mockResolvedValue(exito(emitida, 201));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateInvitation(), { wrapper: envolver });

    // Act
    const respuesta = await result.current.mutateAsync({
      email: 'nuevo@example.com',
      role: 'OPERATOR',
    });

    // Assert
    expect(cliente.POST).toHaveBeenCalledWith('/api/v1/invitations', {
      body: { email: 'nuevo@example.com', role: 'OPERATOR' },
    });
    expect(respuesta).toEqual(emitida);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['invitations'] });
  });

  it('Camino 4 - revocar una invitación acepta un 204 y refresca las pendientes', async () => {
    // Arrange
    cliente.DELETE.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper: envolver });

    // Act
    await result.current.mutateAsync('inv-1');

    // Assert
    expect(cliente.DELETE).toHaveBeenCalledWith('/api/v1/invitations/{id}', {
      params: { path: { id: 'inv-1' } },
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['invitations'] });
  });

  it('Camino 5 - los datos de la organización se piden sin parámetros', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ id: 'org-1', name: 'Bar La Esquina' }));

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper: envolver });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/organization');
    expect(result.current.data).toEqual({ id: 'org-1', name: 'Bar La Esquina' });
  });

  it('Camino 6 - editar la organización refresca sus datos y la sesión que la muestra', async () => {
    // Arrange
    cliente.PATCH.mockResolvedValue(exito({ id: 'org-1', name: 'La Esquina' }));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateOrganization(), { wrapper: envolver });

    // Act
    await result.current.mutateAsync({ name: 'La Esquina' });

    // Assert
    expect(cliente.PATCH).toHaveBeenCalledWith('/api/v1/organization', {
      body: { name: 'La Esquina' },
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['organization'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['session'] });
  });
});
