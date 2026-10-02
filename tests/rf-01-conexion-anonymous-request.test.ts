import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/session';

// openapi-fetch captures `globalThis.fetch` when the client is created, at
// import time, so the double has to be in place before any import runs.
const { fetchSimulado } = vi.hoisted(() => {
  const fetchSimulado = vi.fn();
  globalThis.fetch = fetchSimulado;
  return { fetchSimulado };
});

describe('cliente de la API sin sesión', () => {
  beforeEach(() => {
    fetchSimulado.mockReset();
  });

  it('Camino 1 - sin token ni cookie de refresh, la petición sale sin Authorization', async () => {
    // Arrange: the refresh is refused, then the real request answers.
    fetchSimulado.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'ana@example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Act
    await api.POST('/api/v1/invitations/lookup', { body: { token: 'tok-1' } });

    // Assert
    const peticion = fetchSimulado.mock.calls[1][0] as Request;
    expect(peticion.headers.get('Authorization')).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
