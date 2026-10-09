import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ADMIN_NAVIGATION, MAIN_NAVIGATION, visibleNavigation } from '@/config/navigation';
import { AuditLogView } from '@/features/admin/AuditLogView';
import { UsersView } from '@/features/admin/UsersView';
import { PermissionGate } from '@/features/auth/PermissionGate';
import type { Permission } from '@/lib/api';
import { fakeApi } from '@tests/support/fake-api';
import { messages, PERMISSIONS, renderScreen } from '@tests/support/render-screen';

const puede = (rol: keyof typeof PERMISSIONS) => (permiso: Permission) =>
  PERMISSIONS[rol].includes(permiso);

/**
 * Regresión de seguridad de RF-29 y RF-30 en el cliente. Ocultar no es un
 * control —la API es quien autoriza—, pero una pantalla sin permiso tampoco
 * debe disparar las peticiones que la API va a rechazar.
 */
describe('RF-29 y RF-30 - Lo que el cliente muestra según el rol', () => {
  it.each(['OPERATOR', 'MANAGER'] as const)(
    'Caso 1 - %s no ve ninguna entrada de administración',
    (rol) => {
      expect(visibleNavigation(ADMIN_NAVIGATION, puede(rol))).toEqual([]);
    },
  );

  it('Caso 2 - un operador no ve reportes en el menú principal', () => {
    const etiquetas = visibleNavigation(MAIN_NAVIGATION, puede('OPERATOR')).map(
      (item) => item.label,
    );

    expect(etiquetas).not.toContain('reports');
  });

  it('Caso 3 - sin user:manage, la pantalla de usuarios no se pinta ni pide la lista', async () => {
    renderScreen(
      <PermissionGate permission="user:manage">
        <UsersView />
      </PermissionGate>,
      'MANAGER',
    );

    expect(await screen.findByText(messages.auth.permissionGate.title)).toBeTruthy();
    expect(fakeApi.callsTo('GET /api/v1/users')).toHaveLength(0);
  });

  it('Caso 4 - sin audit:read, el log de auditoría no se pinta ni se pide', async () => {
    renderScreen(
      <PermissionGate permission="audit:read">
        <AuditLogView />
      </PermissionGate>,
      'OPERATOR',
    );

    expect(await screen.findByText(messages.auth.permissionGate.title)).toBeTruthy();
    expect(fakeApi.callsTo('GET /api/v1/audit-logs')).toHaveLength(0);
  });
});
