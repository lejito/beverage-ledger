import { join } from 'node:path';
import type { NextConfig } from 'next';
import { describe, expect, it } from 'vitest';

interface Regla {
  source: string;
  headers: { key: string; value: string }[];
}

// Loaded by absolute path: the config lives outside src/, and the lint rule
// forbids relative imports that climb out of tests/.
async function cabecerasDeTodasLasRutas(): Promise<Record<string, string>> {
  const { default: config } = (await import(join(process.cwd(), 'next.config.ts'))) as {
    default: NextConfig;
  };
  const reglas = ((await config.headers?.()) ?? []) as Regla[];
  const global = reglas.find((regla) => regla.source === '/:path*');
  return Object.fromEntries(
    (global?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]),
  );
}

/**
 * Regresión de seguridad transversal del cliente: lo que la app le pide al
 * navegador. La prueba E2E comprueba además que `next start` lo entregue.
 */
describe('Cabeceras de seguridad de la aplicación web', () => {
  it('Caso 1 - el navegador no adivina tipos ni deja enmarcar la app en otro sitio', async () => {
    const cabeceras = await cabecerasDeTodasLasRutas();

    expect(cabeceras['x-content-type-options']).toBe('nosniff');
    expect(cabeceras['x-frame-options']).toBe('DENY');
  });

  it('Caso 2 - el Referer no lleva la ruta a otros sitios: el token de /invite/<token> no se filtra', async () => {
    const cabeceras = await cabecerasDeTodasLasRutas();

    expect(cabeceras['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('Caso 3 - Next no se anuncia en X-Powered-By', async () => {
    const { default: config } = (await import(join(process.cwd(), 'next.config.ts'))) as {
      default: NextConfig;
    };

    expect(config.poweredByHeader).toBe(false);
  });
});
