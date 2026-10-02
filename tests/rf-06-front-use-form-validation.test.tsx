import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { FormEvent, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '@/i18n/messages/es.json';
import type { FieldIssue } from '@/lib/forms';
import { useFormValidation } from '@/lib/forms/useFormValidation';

const textos = messages.common.validation;

const conTraducciones = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
    {children}
  </NextIntlClientProvider>
);

const validar = (issues: Record<string, FieldIssue | undefined>) =>
  renderHook(() => useFormValidation(issues), { wrapper: conTraducciones }).result;

const evento = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent;

describe('useFormValidation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Camino 1 - un campo con problema no muestra nada hasta tocarlo', () => {
    // Arrange
    const result = validar({ nombre: { kind: 'required' } });

    // Act
    const antes = result.current.errorFor('nombre');
    act(() => result.current.touch('nombre'));

    // Assert
    expect(antes).toBeUndefined();
    expect(result.current.errorFor('nombre')).toBe(textos.required);
    expect(result.current.alert).toBeUndefined();
  });

  it.each<[string, FieldIssue, string]>([
    ['minLength', { kind: 'minLength', count: 12 }, 'Escribe al menos 12 caracteres.'],
    ['min', { kind: 'min', min: 0 }, 'Tiene que ser 0 o más.'],
    ['max', { kind: 'max', max: 100 }, 'Tiene que ser 100 o menos.'],
    ['email', { kind: 'email' }, textos.email],
  ])('Camino 2 - el problema %s se traduce con sus valores', (_tipo, problema, mensaje) => {
    // Arrange
    const result = validar({ campo: problema });

    // Act
    act(() => result.current.touch('campo'));

    // Assert
    expect(result.current.errorFor('campo')).toBe(mensaje);
  });

  it('Camino 3 - enviar un formulario válido llama al manejador y no avisa', () => {
    // Arrange
    const result = validar({ nombre: undefined });
    const alEnviar = vi.fn();
    const enviado = evento();

    // Act
    act(() => result.current.onSubmit(alEnviar)(enviado));

    // Assert
    expect(enviado.preventDefault).toHaveBeenCalled();
    expect(alEnviar).toHaveBeenCalledOnce();
    expect(result.current.isValid).toBe(true);
    expect(result.current.attempt()).toBe(true);
  });

  it('Camino 4 - enviar con problemas no llama al manejador y resume cuántos faltan', () => {
    // Arrange
    const result = validar({ nombre: { kind: 'required' }, correo: { kind: 'email' } });
    const alEnviar = vi.fn();

    // Act
    act(() => result.current.onSubmit(alEnviar)(evento()));

    // Assert
    expect(alEnviar).not.toHaveBeenCalled();
    expect(result.current.alert).toBe('Faltan 2 campos por revisar.');
    expect(result.current.errorFor('correo')).toBe(textos.email);
  });

  it('Camino 5 - un intento fallido lleva el foco al primer campo con problema', () => {
    // Arrange
    const result = validar({ nombre: { kind: 'required' } });
    const formulario = document.createElement('form');
    formulario.innerHTML =
      '<div><input id="valido" /></div><div data-invalid><input id="invalido" /></div>';
    document.body.append(formulario);
    result.current.ref.current = formulario;

    // Act
    act(() => {
      result.current.attempt();
    });

    // Assert
    expect(document.activeElement?.id).toBe('invalido');
  });
});
