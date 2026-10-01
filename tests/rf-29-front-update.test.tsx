import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersView } from '@/features/admin/UsersView';
import messages from '@/i18n/messages/es.json';
import { ApiError, type User } from '@/lib/api';

const { mutateAsync, useUsers, notify } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  useUsers: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@/features/admin/api', () => ({
  useUsers,
  useUpdateUser: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'admin-1' } }) }));

// Siblings on the same screen with their own queries; changeStatus never touches them.
vi.mock('@/features/invitations', () => ({
  InvitationsCard: () => null,
  InviteDialog: () => null,
}));

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useNotify: () => notify,
}));

const textos = messages.admin.users;

const miembro = (status: User['status']) =>
  ({
    id: 'user-2',
    name: 'Usuario Prueba',
    email: 'usuario@example.com',
    role: 'OPERATOR',
    status,
    avatarUrl: null,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
  }) as User;

const conTraducciones = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
    {children}
  </NextIntlClientProvider>
);

/** Opens the confirmation from the row and accepts it, as an admin would. */
const confirmar = (accion: string) => {
  fireEvent.click(screen.getAllByRole('button', { name: accion })[0]);
  const dialogo = screen.getByRole('dialog');
  fireEvent.click(within(dialogo).getByRole('button', { name: accion }));
};

describe('changeStatus - Front', () => {
  afterEach(() => {
    cleanup();
  });

  const mostrar = (usuario: User) => {
    useUsers.mockReturnValue({
      data: { data: [usuario], meta: { page: 1, pageSize: 10, total: 1, pageCount: 1, count: 1 } },
      error: null,
      isPending: false,
      isPlaceholderData: false,
      refetch: vi.fn(),
    });
    render(<UsersView />, { wrapper: conTraducciones });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Camino 1 - usuario suspendido se reactiva exitosamente', async () => {
    // Arrange
    mutateAsync.mockResolvedValue({ ...miembro('ACTIVE') });
    mostrar(miembro('SUSPENDED'));

    // Act
    confirmar(textos.reactivate);

    // Assert
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'success',
        textos.reactivatedTitle,
        textos.reactivatedDescription.replace('{name}', 'Usuario Prueba'),
      ),
    );
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'user-2', input: { status: 'ACTIVE' } });
  });

  it('Camino 2 - usuario activo se suspende exitosamente', async () => {
    // Arrange
    mutateAsync.mockResolvedValue({ ...miembro('SUSPENDED') });
    mostrar(miembro('ACTIVE'));

    // Act
    confirmar(textos.suspend);

    // Assert
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'success',
        textos.suspendedTitle,
        textos.suspendedDescription.replace('{name}', 'Usuario Prueba'),
      ),
    );
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'user-2', input: { status: 'SUSPENDED' } });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('Camino 3 - la mutacion falla y se notifica error', async () => {
    // Arrange
    mutateAsync.mockRejectedValue(
      new ApiError(404, {
        statusCode: 404,
        error: 'Not Found',
        message: 'User not found',
        path: '/api/v1/users/user-2',
        timestamp: '',
      }),
    );
    mostrar(miembro('ACTIVE'));

    // Act
    confirmar(textos.suspend);

    // Assert
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith('error', textos.statusFailed, 'User not found'),
    );
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});
