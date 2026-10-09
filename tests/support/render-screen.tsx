import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { Providers } from '@/app/providers';
import messages from '@/i18n/messages/es.json';
import { fakeApi, json } from './fake-api';

export type Role = 'OPERATOR' | 'MANAGER' | 'ORG_ADMIN';

// Mirrors the API's permissions.config.ts for the screens these tests render.
const OPERATOR = ['movement:read', 'movement:create-outbound', 'stock:read'];
const MANAGER = [
  ...OPERATOR,
  'movement:create-inbound',
  'movement:create-adjustment',
  'movement:create-transfer',
  'movement:cancel',
  'report:read',
];
const ORG_ADMIN = [
  ...MANAGER,
  'catalog:manage',
  'user:manage',
  'organization:manage',
  'audit:read',
];

export const PERMISSIONS: Record<Role, string[]> = { OPERATOR, MANAGER, ORG_ADMIN };

export const SIGNED_IN_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@beverageledger.test',
  name: 'Ana Admin',
  avatarUrl: null,
  status: 'ACTIVE',
};

const ORGANIZATION = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Bar de pruebas',
  slug: 'demo',
  logoUrl: null,
  timezone: 'America/Bogota',
};

/** Routes the refresh cookie and /auth/me so the real AuthProvider finds a session. */
export function signedInAs(role: Role | null): void {
  if (!role) {
    fakeApi.on(
      'POST /api/v1/auth/refresh',
      json(401, { statusCode: 401, message: 'Invalid session' }),
    );
    return;
  }
  const user = { ...SIGNED_IN_USER, role };
  fakeApi.on(
    'POST /api/v1/auth/refresh',
    json(200, { accessToken: 'jwt-de-prueba', expiresIn: 900, user }),
  );
  fakeApi.on(
    'GET /api/v1/auth/me',
    json(200, { user, organization: ORGANIZATION, permissions: PERMISSIONS[role] }),
  );
}

/** Renders a screen inside the app's real providers, in Spanish. */
export function renderScreen(ui: ReactElement, role: Role | null = 'ORG_ADMIN') {
  signedInAs(role);
  return render(
    <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
      <Providers>{ui}</Providers>
    </NextIntlClientProvider>,
  );
}

export { messages };
