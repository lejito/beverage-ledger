import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROUTES, safeReturnTo } from '@/config/navigation';
import { AuthGuard } from '@/features/auth/AuthGuard';
import { LoginForm } from '@/features/auth/AuthForm';
import { fakeApi, json } from '@tests/support/fake-api';
import { location, router } from '@tests/support/navigation';
import { messages, renderScreen, SIGNED_IN_USER } from '@tests/support/render-screen';

const TOKEN = 'jwt-que-no-debe-persistir';

/** Regresión de seguridad de RF-01 en el cliente: dónde vive la sesión y a dónde lleva el login. */
describe('RF-01 - Seguridad de la sesión en el cliente', () => {
  it('Caso 1 - tras entrar, el token solo vive en memoria: ni localStorage, ni sessionStorage, ni cookies', async () => {
    fakeApi.on(
      'POST /api/v1/auth/login',
      json(200, { accessToken: TOKEN, expiresIn: 900, user: SIGNED_IN_USER }),
    );
    renderScreen(<LoginForm />, null);

    fireEvent.change(screen.getByLabelText(messages.auth.fields.email), {
      target: { value: SIGNED_IN_USER.email },
    });
    fireEvent.change(screen.getByLabelText(messages.auth.fields.password), {
      target: { value: 'Correcta-2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: messages.auth.signIn.submit }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());

    const almacenado = [
      ...Object.values({ ...localStorage }),
      ...Object.values({ ...sessionStorage }),
      document.cookie,
    ].join(' ');
    expect(almacenado).not.toContain(TOKEN);
  });

  it.each([
    'https://sitio-ajeno.example',
    '//sitio-ajeno.example',
    '/\\sitio-ajeno.example',
    'javascript:alert(1)',
  ])('Caso 2 - ?next=%s no saca al usuario de la aplicación', (destino) => {
    expect(safeReturnTo(destino)).toBe(ROUTES.dashboard);
  });

  it('Caso 3 - un ?next= interno se respeta', () => {
    expect(safeReturnTo('/catalog?status=inactive')).toBe('/catalog?status=inactive');
  });

  it('Caso 4 - una ruta privada sin sesión no se pinta y lleva al login recordando el destino', async () => {
    location.pathname = '/admin/users';
    renderScreen(
      <AuthGuard>
        <p>contenido privado</p>
      </AuthGuard>,
      null,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(router.replace.mock.calls[0]?.[0]).toMatch(/^\/login\?next=%2Fadmin%2Fusers/);
    expect(screen.queryByText('contenido privado')).toBeNull();
  });
});
