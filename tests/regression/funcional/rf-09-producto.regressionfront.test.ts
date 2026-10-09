import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useBrands,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
} from '@/features/catalog/api';
import { ApiError } from '@/lib/api';
import { MAX_PAGE_SIZE } from '@/lib/hooks';

const { cliente } = vi.hoisted(() => ({
  cliente: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: cliente,
}));

const exito = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

const pagina = (numero: number, pageCount: number) =>
  exito({ data: [{ id: `ref-${numero}` }], meta: { page: numero, pageCount } });

const conCliente = (client: QueryClient) =>
  function Proveedor({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };

/**
 * Regresión de RF-09 en el cliente: los hooks reales del catálogo con la API
 * simulada. Una escritura de producto tiene que refrescar todo lo que lo
 * muestra, y las listas de referencia tienen que venir completas.
 */
describe('RF-09 Frontend - Regresión de la gestión de productos', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('Camino 1 - editar manda el id en la ruta y solo los campos cambiados', async () => {
    // Arrange
    cliente.PATCH.mockResolvedValue(exito({ id: 'product-1', origin: 'Cuba' }));
    const { result } = renderHook(() => useUpdateProduct(), { wrapper: conCliente(client) });

    // Act
    await result.current.mutateAsync({ id: 'product-1', input: { origin: 'Cuba' } });

    // Assert
    expect(cliente.PATCH).toHaveBeenCalledWith('/api/v1/products/{id}', {
      params: { path: { id: 'product-1' } },
      body: { origin: 'Cuba' },
    });
  });

  it('Camino 2 - editar refresca productos, facetas y existencias', async () => {
    // Arrange
    cliente.PATCH.mockResolvedValue(exito({ id: 'product-1' }));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateProduct(), { wrapper: conCliente(client) });

    // Act
    await result.current.mutateAsync({ id: 'product-1', input: { minimumStock: 6 } });

    // Assert
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['products'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['product-facets'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['stock'] });
  });

  it('Camino 3 - crear también refresca las existencias', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(exito({ id: 'product-2' }));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProduct(), { wrapper: conCliente(client) });

    // Act
    await result.current.mutateAsync({
      name: 'Havana Club 7',
      categoryId: 'category-1',
      caseSize: 12,
    });

    // Assert
    expect(cliente.POST).toHaveBeenCalledWith('/api/v1/products', {
      body: { name: 'Havana Club 7', categoryId: 'category-1', caseSize: 12 },
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['stock'] });
  });

  it('Camino 4 - un nombre repetido llega como ApiError 409 y no refresca nada', async () => {
    // Arrange
    cliente.PATCH.mockResolvedValue({
      error: {
        statusCode: 409,
        error: 'Conflict',
        message: 'Another product already uses that name',
        path: '/api/v1/products/product-1',
        timestamp: '',
      },
      response: new Response(null, { status: 409 }),
    });
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateProduct(), { wrapper: conCliente(client) });

    // Act
    const error = await result.current
      .mutateAsync({ id: 'product-1', input: { name: 'Bacardi Blanco' } })
      .catch((causa: unknown) => causa);

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect(invalidar).not.toHaveBeenCalled();
  });

  it('Camino 5 - el selector de categorías recorre todas las páginas', async () => {
    // Arrange
    cliente.GET.mockResolvedValueOnce(pagina(1, 2)).mockResolvedValueOnce(pagina(2, 2));

    // Act
    const { result } = renderHook(() => useCategories(), { wrapper: conCliente(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(result.current.data).toEqual([{ id: 'ref-1' }, { id: 'ref-2' }]);
    expect(cliente.GET).toHaveBeenNthCalledWith(2, '/api/v1/categories', {
      params: { query: { page: 2, pageSize: MAX_PAGE_SIZE } },
    });
  });

  it('Camino 6 - el recorrido de marcas tiene un tope de páginas', async () => {
    // Arrange
    cliente.GET.mockImplementation(
      async (_ruta: string, opciones: { params: { query: { page: number } } }) =>
        pagina(opciones.params.query.page, 50),
    );

    // Act
    const { result } = renderHook(() => useBrands(), { wrapper: conCliente(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledTimes(10);
    expect(result.current.data).toHaveLength(10);
  });
});
