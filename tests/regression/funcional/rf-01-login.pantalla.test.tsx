import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/config/navigation';
import { LoginForm } from '@/features/auth/AuthForm';
import { apiError, fakeApi, json } from '@tests/support/fake-api';
import { location, router } from '@tests/support/navigation';
import { messages, renderScreen, SIGNED_IN_USER } from '@tests/support/render-screen';

const textos = messages.auth;
const validacion = messages.common.validation;

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

const entrar = () => fireEvent.click(screen.getByRole('button', { name: textos.signIn.submit }));

/**
 * Regresión funcional de RF-01 sobre la pantalla real: formulario, validación,
 * proveedor de sesión y cliente HTTP, con solo la red simulada.
 */
describe('RF-01 - Pantalla de inicio de sesión', () => {
  it('Caso 1 - enviar vacío marca los dos campos y no llama a la API (heurísticas 31 y 35)', async () => {
    renderScreen(<LoginForm />, null);

    entrar();

    expect(await screen.findAllByText(validacion.required)).toHaveLength(2);
    expect(fakeApi.callsTo('POST /api/v1/auth/login')).toHaveLength(0);
  });

  it('Caso 2 - un correo mal formado se señala al salir del campo, antes de enviar', async () => {
    renderScreen(<LoginForm />, null);

    escribir(textos.fields.email, 'ana-sin-arroba');
    fireEvent.blur(screen.getByLabelText(textos.fields.email));

    expect(await screen.findByText(validacion.email)).toBeTruthy();
  });

  it('Caso 3 - credenciales rechazadas muestran el motivo y no navegan', async () => {
    fakeApi.on('POST /api/v1/auth/login', apiError(401, 'Invalid credentials'));
    renderScreen(<LoginForm />, null);

    escribir(textos.fields.email, SIGNED_IN_USER.email);
    escribir(textos.fields.password, 'Incorrecta-2026');
    entrar();

    expect(await screen.findByText('Invalid credentials')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('Caso 4 - un login correcto envía las credenciales y entra al tablero', async () => {
    renderScreen(<LoginForm />, null);
    fakeApi.on(
      'POST /api/v1/auth/login',
      json(200, {
        accessToken: 'jwt-nuevo',
        expiresIn: 900,
        user: { ...SIGNED_IN_USER, role: 'OPERATOR' },
      }),
    );

    escribir(textos.fields.email, SIGNED_IN_USER.email);
    escribir(textos.fields.password, 'Correcta-2026');
    entrar();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ROUTES.dashboard));
    expect(fakeApi.callsTo('POST /api/v1/auth/login')[0]?.body).toEqual({
      email: SIGNED_IN_USER.email,
      password: 'Correcta-2026',
    });
  });

  it('Caso 5 - un ?next= hacia otro sitio se ignora: entra al tablero y no sale de la app', async () => {
    location.searchParams = new URLSearchParams({ next: '//sitio-ajeno.example/robo' });
    renderScreen(<LoginForm />, null);
    fakeApi.on(
      'POST /api/v1/auth/login',
      json(200, {
        accessToken: 'jwt-nuevo',
        expiresIn: 900,
        user: { ...SIGNED_IN_USER, role: 'OPERATOR' },
      }),
    );

    escribir(textos.fields.email, SIGNED_IN_USER.email);
    escribir(textos.fields.password, 'Correcta-2026');
    entrar();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ROUTES.dashboard));
  });
});
