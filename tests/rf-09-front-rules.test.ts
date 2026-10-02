import { describe, expect, it } from 'vitest';
import { chosen, email, numeric, text, url } from '@/lib/forms/rules';

describe('text', () => {
  it('Camino 1 - vacío y opcional, no hay problema', () => {
    expect(text('   ', { optional: true })).toBeUndefined();
  });

  it('Camino 2 - vacío y obligatorio, es requerido', () => {
    expect(text('')).toEqual({ kind: 'required' });
  });

  it('Camino 3 - con contenido suficiente, no hay problema', () => {
    expect(text('Ron', { minLength: 2 })).toBeUndefined();
  });
});

describe('email', () => {
  it.each([
    ['vacío y opcional', '', { optional: true }, undefined],
    ['vacío y obligatorio', '  ', {}, { kind: 'required' }],
    ['sin dominio', 'ana@', {}, { kind: 'email' }],
    ['sin punto en el dominio', 'ana@example', {}, { kind: 'email' }],
    ['con espacios internos', 'ana maria@example.com', {}, { kind: 'email' }],
    ['bien formado, con espacios alrededor', '  ana@example.com ', {}, undefined],
  ])('Camino - %s', (_caso, valor, opciones, esperado) => {
    expect(email(valor, opciones)).toEqual(esperado);
  });
});

describe('url', () => {
  it.each([
    ['vacía y opcional por defecto', '', {}, undefined],
    ['vacía y obligatoria', '', { optional: false }, { kind: 'required' }],
    ['que no es una URL', 'no es una url', {}, { kind: 'url' }],
    ['con un protocolo distinto de http(s)', 'ftp://example.com/logo.png', {}, { kind: 'url' }],
    ['https válida', 'https://example.com/logo.png', {}, undefined],
    ['http válida', 'http://example.com', {}, undefined],
  ])('Camino - %s', (_caso, valor, opciones, esperado) => {
    expect(url(valor, opciones)).toEqual(esperado);
  });
});

describe('numeric', () => {
  it.each([
    ['vacío y opcional por defecto', '', {}, undefined],
    ['vacío y obligatorio', ' ', { optional: false }, { kind: 'required' }],
    ['que no es un número', 'doce', {}, { kind: 'number' }],
    ['decimal donde se pide entero', '1.5', { integer: true }, { kind: 'integer' }],
    ['por debajo del mínimo', '-1', { min: 0 }, { kind: 'min', min: 0 }],
    ['por encima del máximo', '101', { max: 100 }, { kind: 'max', max: 100 }],
    ['dentro de los límites', '40', { min: 0, max: 100, integer: true }, undefined],
  ])('Camino - %s', (_caso, valor, opciones, esperado) => {
    expect(numeric(valor, opciones)).toEqual(esperado);
  });
});

describe('chosen', () => {
  it('Camino 1 - el marcador vacío del select cuenta como no elegido', () => {
    expect(chosen('')).toEqual({ kind: 'required' });
  });

  it('Camino 2 - una opción elegida no tiene problema', () => {
    expect(chosen('category-1')).toBeUndefined();
  });
});
