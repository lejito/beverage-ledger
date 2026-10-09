import type { Browser, BrowserContextOptions } from '@playwright/test';
import { Cast, Notepad, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { CallAnApi } from '@serenity-js/rest';
import { e2eEnv, WEB_URL } from '@e2e/support/env';

/** What the actors of one scenario write down and read back from each other. */
export interface Notas {
  rutaDeInvitacion: string;
  tokenDeAdministrador: string;
}

/**
 * Every actor browses in its own browser context, against the compiled app, and
 * can call the deployed API. They share one notepad, so the administrator can
 * hand the invitation link to the person it invites.
 */
export function elenco(browser: Browser, contextOptions: BrowserContextOptions): Cast {
  const notepad = Notepad.empty<Notas>();
  const { apiUrl } = e2eEnv();

  return Cast.where((actor) =>
    actor.whoCan(
      BrowseTheWebWithPlaywright.using(browser, {
        ...contextOptions,
        baseURL: WEB_URL,
        locale: 'es-CO',
      }),
      CallAnApi.at(`${apiUrl}/api/v1/`),
      TakeNotes.using(notepad),
    ),
  );
}
