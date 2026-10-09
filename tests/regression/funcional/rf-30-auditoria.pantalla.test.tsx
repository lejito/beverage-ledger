import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditLogView } from '@/features/admin/AuditLogView';
import { fakeApi, json } from '@tests/support/fake-api';
import { MEMBER, page, PRODUCT } from '@tests/support/pages';
import { messages, renderScreen } from '@tests/support/render-screen';

const textos = messages.admin.audit;

const ENTRADA = {
  id: '77777777-7777-4777-8777-777777777777',
  action: 'product.deactivated',
  entity: 'product',
  entityId: PRODUCT.id,
  metadata: { name: PRODUCT.name },
  ipAddress: '203.0.113.7',
  createdAt: '2026-10-01T15:30:00.000Z',
  user: { id: MEMBER.id, name: MEMBER.name, email: MEMBER.email },
};

/** Regresión funcional de RF-30 sobre la pantalla real del log de auditoría. */
describe('RF-30 - Pantalla del log de auditoría', () => {
  it('Caso 1 - cada entrada dice quién, qué y desde dónde, en español', async () => {
    fakeApi.on('GET /api/v1/audit-logs', json(200, page([ENTRADA])));
    fakeApi.on('GET /api/v1/users', json(200, page([MEMBER])));
    renderScreen(<AuditLogView />, 'ORG_ADMIN');

    expect((await screen.findAllByText(MEMBER.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(textos.actionNames.product.deactivated).length).toBeGreaterThan(0);
    expect(screen.getAllByText('203.0.113.7').length).toBeGreaterThan(0);
  });

  it('Caso 2 - sin entradas muestra un estado vacío que lo dice', async () => {
    fakeApi.on('GET /api/v1/audit-logs', json(200, page([])));
    fakeApi.on('GET /api/v1/users', json(200, page([])));
    renderScreen(<AuditLogView />, 'ORG_ADMIN');

    expect(await screen.findByText(textos.empty)).toBeTruthy();
  });

  it('Caso 3 - el log se pide paginado y sin filtros al abrir la pantalla', async () => {
    fakeApi.on('GET /api/v1/audit-logs', json(200, page([ENTRADA])));
    fakeApi.on('GET /api/v1/users', json(200, page([MEMBER])));
    renderScreen(<AuditLogView />, 'ORG_ADMIN');

    await screen.findAllByText(MEMBER.name);
    const [peticion] = fakeApi.callsTo('GET /api/v1/audit-logs');

    expect(peticion?.url.searchParams.get('page')).toBe('1');
    expect(peticion?.url.searchParams.has('entity')).toBe(false);
    expect(peticion?.url.searchParams.has('action')).toBe(false);
  });

  it('Caso 4 - si la API no responde, la pantalla lo dice en vez de quedar en blanco', async () => {
    fakeApi.on('GET /api/v1/audit-logs', json(503, { statusCode: 503, message: 'Unavailable' }));
    fakeApi.on('GET /api/v1/users', json(200, page([])));
    renderScreen(<AuditLogView />, 'ORG_ADMIN');

    expect(await screen.findByText(textos.loadFailed, {}, { timeout: 5_000 })).toBeTruthy();
  });
});
