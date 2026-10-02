import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// src/config/api.ts reads the environment when the module loads, so each case
// imports a fresh copy after setting the variables it needs.
const cargar = () => import('@/config/api');

describe('configuración de la API', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Camino 1 - sin NEXT_PUBLIC_API_URL, el módulo se niega a cargar', async () => {
    // Arrange
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    // Act
    const carga = cargar();

    // Assert
    await expect(carga).rejects.toThrow('NEXT_PUBLIC_API_URL is not set');
  });

  it('Camino 2 - con la variable, deriva la documentación y el login de Google', async () => {
    // Arrange
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SIGN_IN', 'true');

    // Act
    const config = await cargar();

    // Assert
    expect(config.API_ORIGIN).toBe('https://api.example.com');
    expect(config.API_DOCS_URL).toBe('https://api.example.com/docs');
    expect(config.GOOGLE_SIGN_IN_URL).toBe('https://api.example.com/api/v1/auth/google');
    expect(config.IS_GOOGLE_SIGN_IN_ENABLED).toBe(true);
  });

  it('Camino 3 - el login de Google queda oculto salvo que se active explícitamente', async () => {
    // Arrange
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SIGN_IN', 'false');

    // Act
    const config = await cargar();

    // Assert
    expect(config.IS_GOOGLE_SIGN_IN_ENABLED).toBe(false);
  });
});
