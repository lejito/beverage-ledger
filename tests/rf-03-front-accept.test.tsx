import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/config/navigation';
import { AcceptInviteForm } from '@/features/invitations/AcceptInviteForm';
import messages from '@/i18n/messages/es.json';
import { ApiError } from '@/lib/api';

const { useInvitationPreview } = vi.hoisted(() => ({ useInvitationPreview: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

vi.mock('@/features/invitations/api', () => ({
  useInvitationPreview,
  useAcceptInvitation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const conTraducciones = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
    {children}
  </NextIntlClientProvider>
);

const mostrar = () =>
  render(<AcceptInviteForm token="token-de-prueba" />, {
    wrapper: conTraducciones,
  });

describe('AcceptInviteForm render - Front', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Camino 1 - vista previa cargando, se muestra spinner', () => {
    // Arrange
    useInvitationPreview.mockReturnValue({ isPending: true, isError: false });

    // Act
    mostrar();

    // Assert
    expect(screen.getByLabelText(messages.invite.loading)).toBeDefined();
    expect(screen.queryByRole('button', { name: messages.invite.submit })).toBeNull();
    expect(useInvitationPreview).toHaveBeenCalledWith('token-de-prueba');
  });

  it('Camino 2 - token invalido, se muestra tarjeta de error', () => {
    // Arrange
    useInvitationPreview.mockReturnValue({
      isPending: false,
      isError: true,
      error: new ApiError(404, {
        statusCode: 404,
        error: 'Not Found',
        message: 'This invitation link is no longer valid. Ask for a new one',
        path: '/api/v1/invitations/lookup',
        timestamp: '',
      }),
    });

    // Act
    mostrar();

    // Assert
    expect(screen.getByText(messages.invite.invalidTitle)).toBeDefined();
    expect(
      screen.getByText('This invitation link is no longer valid. Ask for a new one'),
    ).toBeDefined();
    expect(
      screen.getByRole('link', { name: messages.invite.backToSignIn }).getAttribute('href'),
    ).toBe(ROUTES.signIn);
    expect(screen.queryByRole('button', { name: messages.invite.submit })).toBeNull();
  });

  it('Camino 3 - token valido, se muestra formulario de aceptacion', () => {
    // Arrange
    useInvitationPreview.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        email: 'invitado@ejemplo.com',
        role: 'OPERATOR',
        organizationName: 'Bar La Esquina',
        expiresAt: '2026-10-15T00:00:00.000Z',
      },
    });

    // Act
    mostrar();

    // Assert
    expect(screen.getByText('Te invitaron a Bar La Esquina')).toBeDefined();
    expect(
      screen.getByText(
        `Entrarás como invitado@ejemplo.com, con el rol de ${messages.admin.roles.OPERATOR}.`,
      ),
    ).toBeDefined();
    expect(screen.getByLabelText(messages.invite.name)).toBeDefined();
    expect(screen.getByLabelText(messages.invite.password)).toBeDefined();
    expect(screen.getByRole('button', { name: messages.invite.submit })).toBeDefined();
  });
});
