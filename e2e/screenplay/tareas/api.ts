import {
  Interaction,
  notes,
  TakeNotes,
  type AnswersQuestions,
  type UsesAbilities,
} from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';
import type { Credentials } from '@e2e/support/env';
import { waitForAuthSlot } from '@e2e/support/throttle';
import type { Notas } from '@e2e/screenplay/support/elenco';

interface Pagina<T> {
  data: T[];
}

export interface EntradaDeAuditoria {
  action: string;
  entityId: string | null;
  createdAt: string;
  user: { email: string };
}

/** The administrator's API session, written down for the questions below. */
export const IniciarSesionEnLaApi = {
  como: ({ email, password }: Credentials) =>
    Interaction.where(`#actor abre una sesión en la API como ${email}`, async (actor) => {
      await waitForAuthSlot('/api/v1/auth/login');
      const respuesta = await CallAnApi.as(actor).request({
        method: 'POST',
        url: 'auth/login',
        data: { email, password },
      });
      (TakeNotes.as(actor) as TakeNotes<Notas>).notepad.set(
        'tokenDeAdministrador',
        respuesta.data.accessToken as string,
      );
    }),
};

type Actor = UsesAbilities & AnswersQuestions;

async function get<T>(actor: Actor, url: string): Promise<T> {
  const token = await actor.answer(notes<Notas>().get('tokenDeAdministrador'));
  const respuesta = await CallAnApi.as(actor).request({
    method: 'GET',
    url,
    headers: { Authorization: `Bearer ${token}` },
  });
  return respuesta.data as T;
}

export async function idDelMiembro(actor: Actor, email: string): Promise<string> {
  const pagina = await get<Pagina<{ id: string; email: string }>>(actor, 'users?pageSize=100');
  const miembro = pagina.data.find((usuario) => usuario.email === email);
  if (!miembro) throw new Error(`${email} is not a member of the organization`);
  return miembro.id;
}

export async function auditoria(actor: Actor, consulta: string): Promise<EntradaDeAuditoria[]> {
  return (await get<Pagina<EntradaDeAuditoria>>(actor, `audit-logs?${consulta}`)).data;
}

/**
 * The safety net for the one member each run creates: whatever happened in the
 * scenario, it ends suspended, as agreed for the deployed database.
 */
export const AsegurarQueEsteSuspendido = (email: string) =>
  Interaction.where(`#actor se asegura de que ${email} quede suspendido`, async (actor) => {
    const pagina = await get<Pagina<{ id: string; email: string; status: string }>>(
      actor,
      'users?pageSize=100',
    );
    const miembro = pagina.data.find((usuario) => usuario.email === email);
    if (!miembro || miembro.status === 'SUSPENDED') return;

    const token = await actor.answer(notes<Notas>().get('tokenDeAdministrador'));
    await CallAnApi.as(actor).request({
      method: 'PATCH',
      url: `users/${miembro.id}`,
      data: { status: 'SUSPENDED' },
      headers: { Authorization: `Bearer ${token}` },
    });
  });
