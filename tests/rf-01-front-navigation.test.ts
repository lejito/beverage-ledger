import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAVIGATION,
  MAIN_NAVIGATION,
  ROUTES,
  safeReturnTo,
  signInPath,
  visibleNavigation,
} from '@/config/navigation';
import type { Permission } from '@/lib/api';

describe('signInPath', () => {
  it('Camino 1 - sin destino, lleva al login a secas', () => {
    expect(signInPath()).toBe('/login');
  });

  it('Camino 2 - el destino es el propio login, no lo repite como parámetro', () => {
    expect(signInPath(ROUTES.signIn)).toBe('/login');
  });

  it('Camino 3 - con destino, lo guarda codificado en ?next=', () => {
    expect(signInPath('/stock?location=bar 1')).toBe('/login?next=%2Fstock%3Flocation%3Dbar%201');
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['no hay destino', null],
    ['el destino no empieza por /', 'stock'],
    ['el destino es una URL absoluta', 'https://evil.example.com'],
    ['el destino es protocol-relative', '//evil.example.com'],
  ])('Camino 1-4 - %s y vuelve al dashboard', (_caso, destino) => {
    expect(safeReturnTo(destino)).toBe('/dashboard');
  });

  it('Camino 5 - el destino es una ruta interna y se respeta', () => {
    expect(safeReturnTo('/movements/abc?tab=items')).toBe('/movements/abc?tab=items');
  });
});

describe('ROUTES', () => {
  it('Camino 1 - las rutas con parámetro arman la URL de cada pantalla', () => {
    expect(ROUTES.acceptInvite('tok-1')).toBe('/invite/tok-1');
    expect(ROUTES.productStock('product-1')).toBe('/stock/product-1');
    expect(ROUTES.newMovement('TRANSFER')).toBe('/movements/new/transfer');
    expect(ROUTES.movement('mov-1')).toBe('/movements/mov-1');
  });
});

describe('visibleNavigation', () => {
  const con =
    (...permisos: Permission[]) =>
    (permiso: Permission) =>
      permisos.includes(permiso);

  it('Camino 1 - sin permisos, solo quedan las entradas abiertas a todos', () => {
    const visibles = visibleNavigation(MAIN_NAVIGATION, con());

    expect(visibles.map((item) => item.label)).toEqual(['catalog']);
  });

  it('Camino 2 - basta uno de los permisos de una entrada para mostrarla', () => {
    const visibles = visibleNavigation(ADMIN_NAVIGATION, con('catalog:manage'));

    expect(visibles.map((item) => item.label)).toEqual([
      'adminCategories',
      'adminBrands',
      'adminLocations',
    ]);
  });
});
