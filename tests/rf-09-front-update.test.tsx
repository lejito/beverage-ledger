import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { SelectOption } from '@/components/ui';
import { ProductFormDialog } from '@/features/catalog/ProductFormDialog';
import messages from '@/i18n/messages/es.json';
import { ApiError, type Product } from '@/lib/api';

const { crear, actualizar, notify } = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@/features/catalog/api', () => ({
  useCategories: () => ({ data: [{ id: 'category-1', name: 'Ron' }] }),
  useBrands: () => ({ data: [{ id: 'brand-1', name: 'Havana Club' }] }),
  useCreateProduct: () => ({ mutateAsync: crear, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: actualizar, isPending: false }),
}));

// The Radix select opens a listbox jsdom cannot drive, so it is swapped for a
// native one that keeps the same contract: value in, onValueChange out.
vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useNotify: () => notify,
  Select: ({
    id,
    value,
    onValueChange,
    options,
  }: {
    id?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
  }) => (
    <select id={id} value={value} onChange={(event) => onValueChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const textos = messages.catalog.form;

const PRODUCTO = {
  id: 'product-1',
  name: 'Havana Club 7',
  category: { id: 'category-1', name: 'Ron' },
  brand: { id: 'brand-1', name: 'Havana Club' },
  subcategory: null,
  abv: 40,
  origin: 'Cuba',
  age: null,
  caseSize: 6,
  minimumStock: null,
  isActive: true,
} as unknown as Product;

const errorDeApi = (status: number, message: string) =>
  new ApiError(status, { statusCode: status, error: 'Error', message, path: '/', timestamp: '' });

const conTraducciones = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
    {children}
  </NextIntlClientProvider>
);

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

describe('submit (ProductFormDialog) - Front', () => {
  afterEach(() => {
    cleanup();
  });

  let onOpenChange: Mock<(open: boolean) => void>;

  const abrir = (product: Product | null) =>
    render(<ProductFormDialog product={product} open onOpenChange={onOpenChange} />, {
      wrapper: conTraducciones,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    onOpenChange = vi.fn<(open: boolean) => void>();
  });

  it('Camino 1 - producto existente actualizado exitosamente', async () => {
    // Arrange
    actualizar.mockResolvedValue({ ...PRODUCTO, name: 'Havana Club 7 Años' });
    abrir(PRODUCTO);

    // Act
    escribir(textos.name, '  Havana Club 7 Años  ');
    escribir(textos.origin, '');
    fireEvent.click(screen.getByRole('button', { name: messages.common.actions.save }));

    // Assert
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(actualizar).toHaveBeenCalledWith({
      id: 'product-1',
      input: {
        name: 'Havana Club 7 Años',
        categoryId: 'category-1',
        brandId: 'brand-1',
        subcategory: undefined,
        abv: 40,
        origin: undefined,
        age: undefined,
        minimumStock: undefined,
      },
    });
    expect(crear).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      'success',
      textos.updatedTitle,
      textos.updatedDescription.replace('{name}', 'Havana Club 7 Años'),
    );
  });

  it('Camino 2 - actualizacion falla y se notifica error', async () => {
    // Arrange
    actualizar.mockRejectedValue(errorDeApi(409, 'Another product already uses that name'));
    abrir(PRODUCTO);

    // Act
    escribir(textos.name, 'Bacardi Blanco');
    fireEvent.click(screen.getByRole('button', { name: messages.common.actions.save }));

    // Assert
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'error',
        textos.updateFailed,
        'Another product already uses that name',
      ),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('Camino 3 - creacion exitosa de un producto nuevo', async () => {
    // Arrange
    crear.mockResolvedValue({ id: 'product-2', name: 'Ron Viejo de Caldas' });
    abrir(null);

    // Act
    escribir(textos.name, 'Ron Viejo de Caldas');
    escribir(textos.category, 'category-1');
    escribir(textos.abv, '35');
    fireEvent.click(screen.getByRole('button', { name: messages.common.actions.create }));

    // Assert
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(crear).toHaveBeenCalledWith({
      name: 'Ron Viejo de Caldas',
      categoryId: 'category-1',
      brandId: null,
      subcategory: undefined,
      abv: 35,
      origin: undefined,
      age: undefined,
      caseSize: 12,
      minimumStock: undefined,
    });
    expect(actualizar).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      'success',
      textos.createdTitle,
      textos.createdDescription.replace('{name}', 'Ron Viejo de Caldas'),
    );
  });

  it('Camino 4 - creacion falla y se notifica error', async () => {
    // Arrange
    crear.mockRejectedValue(errorDeApi(400, 'That category does not exist'));
    abrir(null);

    // Act
    escribir(textos.name, 'Ron Viejo de Caldas');
    escribir(textos.category, 'category-1');
    fireEvent.click(screen.getByRole('button', { name: messages.common.actions.create }));

    // Assert
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'error',
        textos.createFailed,
        'That category does not exist',
      ),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
