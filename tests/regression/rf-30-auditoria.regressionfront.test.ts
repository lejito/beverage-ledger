import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuditLogs, type AuditQuery } from '@/features/admin/api';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  auditActionsOf,
  auditEntityOf,
} from '@/features/admin/audit-actions';
import type { PageParams } from '@/lib/hooks';

const { cliente } = vi.hoisted(() => ({ cliente: { GET: vi.fn() } }));

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
 * Regresión de RF-30 en el cliente: los filtros del log de auditoría y el hook
 * real que lo consulta, con la API simulada.
 */
describe('RF-30 Frontend - Regresión del log de auditoría', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('Camino 1 - cada acción pertenece a la entidad que nombra', () => {
    // Assert
    for (const accion of AUDIT_ACTIONS) {
      expect(accion.startsWith(`${auditEntityOf(accion)}.`)).toBe(true);
    }
  });

  it('Camino 2 - el filtro de entidad cubre las ocho entidades auditadas', () => {
    // Assert
    expect([...AUDIT_ENTITIES].sort()).toEqual([
      'brand',
      'category',
      'invitation',
      'location',
      'movement',
      'organization',
      'product',
      'user',
    ]);
  });

  it('Camino 3 - elegir una entidad acota las acciones a las suyas', () => {
    // Act
    const deProducto = auditActionsOf('product');

    // Assert
    expect(deProducto).toEqual(['product.created', 'product.updated', 'product.deactivated']);
  });

  it('Camino 4 - sin entidad, se ofrecen todas las acciones', () => {
    // Act
    const todas = auditActionsOf('');

    // Assert
    expect(todas).toEqual(AUDIT_ACTIONS);
    expect(new Set(todas).size).toBe(todas.length);
  });

  it('Camino 5 - los filtros y la página viajan juntos al servidor', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ data: [], meta: { page: 2, pageCount: 2 } }));
    const filtros: AuditQuery = { entity: 'user', action: 'user.sign-in-failed' };

    // Act
    const { result } = renderHook(() => useAuditLogs(filtros, { page: 2, pageSize: 25 }), {
      wrapper: conCliente(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/audit-logs', {
      params: {
        query: { entity: 'user', action: 'user.sign-in-failed', page: 2, pageSize: 25 },
      },
    });
  });

  it('Camino 6 - al cambiar de página se conservan las filas anteriores mientras carga', async () => {
    // Arrange
    const primera = { data: [{ id: 'log-1' }], meta: { page: 1, pageCount: 2 } };
    cliente.GET.mockResolvedValueOnce(exito(primera)).mockReturnValueOnce(
      new Promise(() => undefined),
    );
    const { result, rerender } = renderHook(
      ({ pagina }: { pagina: PageParams }) => useAuditLogs({}, pagina),
      { wrapper: conCliente(client), initialProps: { pagina: { page: 1, pageSize: 25 } } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Act
    rerender({ pagina: { page: 2, pageSize: 25 } });

    // Assert
    await waitFor(() => expect(cliente.GET).toHaveBeenCalledTimes(2));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toEqual(primera);
  });
});
