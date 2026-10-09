export interface Credentials {
  email: string;
  password: string;
}

export const WEB_URL = 'http://localhost:3000';

function read(name: string, missing: string[]): string {
  const value = process.env[name]?.trim();
  if (!value) missing.push(name);
  return value ?? '';
}

/**
 * The deployed API the built app talks to and the CI members of its
 * organization. Same variables as the API repository's regression suites.
 * @throws {Error} naming every missing variable.
 */
export function e2eEnv() {
  const missing: string[] = [];
  const credentials = (prefix: string): Credentials => ({
    email: read(`${prefix}_EMAIL`, missing),
    password: read(`${prefix}_PASSWORD`, missing),
  });

  const env = {
    apiUrl: read('NEXT_PUBLIC_API_URL', missing).replace(/\/+$/, ''),
    admin: credentials('CI_ADMIN'),
    manager: credentials('CI_MANAGER'),
    operator: credentials('CI_OPERATOR'),
  };

  if (missing.length > 0) {
    throw new Error(`The browser suites need these variables: ${missing.join(', ')}`);
  }
  return env;
}

export const CI_PRODUCT_NAME = '[CI] Producto de prueba';
