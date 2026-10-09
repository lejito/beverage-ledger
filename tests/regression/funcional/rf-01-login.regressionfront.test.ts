import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { ensureAccessToken, refreshSession } from '@/lib/api/refresh';
import {
  forgetSession,
  getAccessToken,
  onSessionLost,
  storeSession,
  type Session,
} from '@/lib/api/session';

// openapi-fetch captures `globalThis.fetch` when the client is created, at
// import time, so the double has to be in place before any import runs.
const { fetchSimulado } = vi.hoisted(() => {
  const fetchSimulado = vi.fn();
  globalThis.fetch = fetchSimulado;
  return { fetchSimulado };
});

const sesion = (accessToken: string, expiresIn: number) => ({ accessToken, expiresIn }) as Session;

const respuesta = (status: number, cuerpo?: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const peticion = (llamada: number) => fetchSimulado.mock.calls[llamada][0] as Request;

/**
 * Regresión de RF-01 en el cliente: cómo viaja y se renueva la sesión. Se
 * ejercen el cliente HTTP, la renovación y el almacén de sesión reales; solo la
 * red está simulada.
 */
describe('RF-01 Frontend - Regresión de la sesión', () => {
  beforeEach(() => {
    fetchSimulado.mockReset();
  });

  afterEach(() => {
    forgetSession();
  });

  it('Camino 1 - el login no lleva token ni dispara una renovación', async () => {
    // Arrange
    fetchSimulado.mockResolvedValue(respuesta(200, sesion('jwt-nuevo', 900)));

    // Act
    await api.POST('/api/v1/auth/login', {
      body: { email: 'ana@example.com', password: 'Inventario2026' },
    });

    // Assert
    expect(fetchSimulado).toHaveBeenCalledOnce();
    expect(peticion(0).url).toMatch(/\/api\/v1\/auth\/login$/);
    expect(peticion(0).headers.get('Authorization')).toBeNull();
  });

  it('Camino 2 - una ruta protegida usa el token vigente sin renovarlo', async () => {
    // Arrange
    storeSession(sesion('jwt-vigente', 900));
    fetchSimulado.mockResolvedValue(respuesta(200, {}));

    // Act
    await api.GET('/api/v1/auth/me');

    // Assert
    expect(fetchSimulado).toHaveBeenCalledOnce();
    expect(peticion(0).headers.get('Authorization')).toBe('Bearer jwt-vigente');
  });

  it('Camino 3 - un token a punto de vencer se renueva antes de la petición', async () => {
    // Arrange
    storeSession(sesion('jwt-viejo', 10));
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, sesion('jwt-renovado', 900)))
      .mockResolvedValueOnce(respuesta(200, {}));

    // Act
    await api.GET('/api/v1/auth/me');

    // Assert
    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/auth\/refresh$/);
    expect(opciones).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(peticion(1).headers.get('Authorization')).toBe('Bearer jwt-renovado');
  });

  it('Camino 4 - renovaciones simultáneas se reducen a una sola llamada', async () => {
    // Arrange
    fetchSimulado.mockResolvedValue(respuesta(200, sesion('jwt-unico', 900)));

    // Act
    const resultados = await Promise.all([refreshSession(), refreshSession(), ensureAccessToken()]);

    // Assert
    expect(fetchSimulado).toHaveBeenCalledOnce();
    expect(resultados[2]).toBe('jwt-unico');
  });

  it('Camino 5 - un 401 en una ruta protegida cierra la sesión local y avisa', async () => {
    // Arrange
    storeSession(sesion('jwt-revocado', 900));
    const oyente = vi.fn();
    const olvidar = onSessionLost(oyente);
    fetchSimulado.mockResolvedValue(respuesta(401, { statusCode: 401, message: 'Unauthorized' }));

    // Act
    await api.GET('/api/v1/auth/me');

    // Assert
    expect(getAccessToken()).toBeNull();
    expect(oyente).toHaveBeenCalledOnce();
    olvidar();
  });

  it('Camino 6 - un 401 del login no cierra la sesión que ya existía', async () => {
    // Arrange
    storeSession(sesion('jwt-vigente', 900));
    const oyente = vi.fn();
    const olvidar = onSessionLost(oyente);
    fetchSimulado.mockResolvedValue(
      respuesta(401, { statusCode: 401, message: 'Invalid email or password' }),
    );

    // Act
    await api.POST('/api/v1/auth/login', {
      body: { email: 'ana@example.com', password: 'clave-errada' },
    });

    // Assert
    expect(getAccessToken()).toBe('jwt-vigente');
    expect(oyente).not.toHaveBeenCalled();
    olvidar();
  });

  it('Camino 7 - un fallo de red al renovar no borra la sesión', async () => {
    // Arrange
    storeSession(sesion('jwt-viejo', 10));
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    const token = await ensureAccessToken();

    // Assert
    expect(token).toBeNull();
    expect(getAccessToken()).toBe('jwt-viejo');
  });

  it('Camino 8 - una renovación rechazada sí termina la sesión', async () => {
    // Arrange
    storeSession(sesion('jwt-viejo', 10));
    fetchSimulado.mockResolvedValue(respuesta(401));

    // Act
    const renovada = await refreshSession();

    // Assert
    expect(renovada).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('Camino 9 - el token de acceso nunca se persiste en el navegador', () => {
    // Act
    storeSession(sesion('jwt-secreto', 900));

    // Assert
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
    expect(document.cookie).not.toContain('jwt-secreto');
  });
});
