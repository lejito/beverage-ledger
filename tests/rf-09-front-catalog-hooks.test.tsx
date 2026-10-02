import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreateBrand,
  useCreateCategory,
  useDeleteBrand,
  useDeleteCategory,
  useProduct,
  useProductFacets,
  useProducts,
  useUpdateBrand,
  useUpdateCategory,
} from '@/features/catalog/api';

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

const sinCuerpo = () => ({ response: new Response(null, { status: 204 }) });

describe('Hooks del catálogo - Front', () => {
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

  it('Camino 1 - el listado de productos manda filtros y página juntos', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ data: [], meta: { page: 2, pageCount: 2 } }));

    // Act
    const { result } = renderHook(() => useProducts({ search: 'ron' }, { page: 2, pageSize: 25 }), {
      wrapper: envolver,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/products', {
      params: { query: { search: 'ron', page: 2, pageSize: 25 } },
    });
  });

  it('Camino 2 - el detalle de un producto lo pide por su id', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ id: 'product-1', name: 'Havana Club 7' }));

    // Act
    const { result } = renderHook(() => useProduct('product-1'), { wrapper: envolver });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/products/{id}', {
      params: { path: { id: 'product-1' } },
    });
    expect(result.current.data).toEqual({ id: 'product-1', name: 'Havana Club 7' });
  });

  it('Camino 3 - las facetas se piden sin parámetros', async () => {
    // Arrange
    cliente.GET.mockResolvedValue(exito({ origins: ['Cuba'], subcategories: [] }));

    // Act
    const { result } = renderHook(() => useProductFacets(), { wrapper: envolver });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Assert
    expect(cliente.GET).toHaveBeenCalledWith('/api/v1/products/facets');
  });

  it('Camino 4 - crear una categoría la envía y refresca su lista y los productos', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(exito({ id: 'ref-1', name: 'Ron' }, 201));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateCategory(), { wrapper: envolver });

    // Act
    await result.current.mutateAsync({ name: 'Ron', sortOrder: 3 });

    // Assert
    expect(cliente.POST).toHaveBeenCalledWith('/api/v1/categories', {
      body: { name: 'Ron', sortOrder: 3 },
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['categories'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it('Camino 4b - crear una marca la envía y refresca su lista y los productos', async () => {
    // Arrange
    cliente.POST.mockResolvedValue(exito({ id: 'ref-2', name: 'Havana Club' }, 201));
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateBrand(), { wrapper: envolver });

    // Act
    await result.current.mutateAsync({ name: 'Havana Club' });

    // Assert
    expect(cliente.POST).toHaveBeenCalledWith('/api/v1/brands', {
      body: { name: 'Havana Club' },
    });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['brands'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['products'] });
  });

  it.each([
    ['categoría', useUpdateCategory, '/api/v1/categories/{id}', ['categories']],
    ['marca', useUpdateBrand, '/api/v1/brands/{id}', ['brands']],
  ] as const)(
    'Camino 5 - renombrar una %s manda el id en la ruta y refresca los productos',
    async (_caso, useEditar, ruta, clave) => {
      // Arrange
      cliente.PATCH.mockResolvedValue(exito({ id: 'ref-1', name: 'Rones' }));
      const invalidar = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useEditar(), { wrapper: envolver });

      // Act
      await result.current.mutateAsync({ id: 'ref-1', input: { name: 'Rones' } });

      // Assert
      expect(cliente.PATCH).toHaveBeenCalledWith(ruta, {
        params: { path: { id: 'ref-1' } },
        body: { name: 'Rones' },
      });
      expect(invalidar).toHaveBeenCalledWith({ queryKey: clave });
      expect(invalidar).toHaveBeenCalledWith({ queryKey: ['products'] });
    },
  );

  it.each([
    ['categoría', useDeleteCategory, '/api/v1/categories/{id}', ['categories']],
    ['marca', useDeleteBrand, '/api/v1/brands/{id}', ['brands']],
  ] as const)(
    'Camino 6 - borrar una %s acepta un 204 sin cuerpo y refresca su lista',
    async (_caso, useBorrar, ruta, clave) => {
      // Arrange
      cliente.DELETE.mockResolvedValue(sinCuerpo());
      const invalidar = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useBorrar(), { wrapper: envolver });

      // Act
      const borrado = result.current.mutateAsync('ref-1');

      // Assert
      await expect(borrado).resolves.toBeUndefined();
      expect(cliente.DELETE).toHaveBeenCalledWith(ruta, { params: { path: { id: 'ref-1' } } });
      expect(invalidar).toHaveBeenCalledWith({ queryKey: clave });
    },
  );

  it('Camino 7 - borrar una categoría en uso llega como error y no refresca nada', async () => {
    // Arrange
    cliente.DELETE.mockResolvedValue({
      error: {
        statusCode: 409,
        error: 'Conflict',
        message: 'Products still use this category',
        path: '/api/v1/categories/ref-1',
        timestamp: '',
      },
      response: new Response(null, { status: 409 }),
    });
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: envolver });

    // Act
    const borrado = result.current.mutateAsync('ref-1');

    // Assert
    await expect(borrado).rejects.toThrow('Products still use this category');
    expect(invalidar).not.toHaveBeenCalled();
  });
});
