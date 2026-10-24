import messages from '@/i18n/messages/es.json';

export { messages };

export type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR';

export interface Credentials {
  email: string;
  password: string;
}

export const CI_PRODUCT_NAME = '[CI] Producto de prueba';

/** For what appears only after a throttled call, which may wait a minute for its slot. */
export const AFTER_THROTTLED_CALL = { timeout: 90_000 };

interface NextWindow {
  next?: { router?: { push(path: string): void } };
}

declare global {
  // Cypress extends its chainable through declaration merging.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      credentials(role: Role): Chainable<Credentials>;
      takeAuthSlots(...routes: string[]): Chainable<null>;
      submitSignIn(): Chainable<void>;
      waitForHydration(): Chainable<void>;
      signIn(role: Role): Chainable<void>;
      navigateInApp(path: string): Chainable<void>;
      apiLogin(role: Role): Chainable<string>;
      api<T = unknown>(
        method: string,
        path: string,
        options?: { token?: string; body?: RequestBody },
      ): Chainable<Response<T>>;
      expectAccessible(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('credentials', (role: Role) =>
  cy.env([`CI_${role}_EMAIL`, `CI_${role}_PASSWORD`], { log: false }).then((values) => {
    const email = values[`CI_${role}_EMAIL`] as string;
    const password = values[`CI_${role}_PASSWORD`] as string;
    if (!email || !password) throw new Error(`Missing CI_${role}_EMAIL or CI_${role}_PASSWORD`);
    return { email, password };
  }),
);

/**
 * The API allows ten calls a minute on login, refresh and the public invitation
 * routes. Whatever is about to cause one of those calls takes its slot here
 * first, from the budget the Playwright suites share. It is taken by the command
 * and not by a cy.intercept: an intercept does not exist yet in a `before` hook,
 * and Cypress fails one that holds a request longer than its command timeout.
 */
Cypress.Commands.add('takeAuthSlots', (...routes: string[]) =>
  cy.task<null>(
    'authSlots',
    routes.map((route) => `/api/v1/${route}`),
    { log: false },
  ),
);

// Every full load renews the session, and an invitation link also looks it up.
const slotsForALoad = (url: string) => [
  'auth/refresh',
  ...(url.startsWith('/invite/') ? ['invitations/lookup'] : []),
];

// Both are only ever called as visit(url) and reload() here.
Cypress.Commands.overwrite('visit', (visit, url) =>
  cy.takeAuthSlots(...slotsForALoad(String(url))).then(() => visit({ url: String(url) })),
);

Cypress.Commands.overwrite('reload', (reload) =>
  cy.takeAuthSlots('auth/refresh').then(() => (reload as () => Cypress.Chainable)()),
);

Cypress.Commands.add('submitSignIn', () => {
  cy.takeAuthSlots('auth/login');
  cy.findByRole('button', { name: messages.auth.signIn.submit }).click();
});

/**
 * Next prerenders the page and React takes over the inputs a moment later: text
 * typed before that is wiped. The app router appears on `window.next` once
 * hydration is done.
 */
Cypress.Commands.add('waitForHydration', () => {
  cy.window(AFTER_THROTTLED_CALL).should((win) => {
    expect((win as unknown as NextWindow).next?.router, 'Next router').to.exist;
  });
});

Cypress.Commands.add('signIn', (role: Role) => {
  cy.credentials(role).then(({ email, password }) => {
    cy.visit('/login');
    cy.waitForHydration();
    cy.findByLabelText(messages.auth.fields.email).type(email);
    cy.findByLabelText(messages.auth.fields.password).type(password, { log: false });
    cy.submitSignIn();
    cy.location('pathname', AFTER_THROTTLED_CALL).should('eq', '/dashboard');
  });
});

/**
 * Moves inside the app as one of its links would, without reloading: a full load
 * renews the session through /auth/refresh, which the API limits.
 */
Cypress.Commands.add('navigateInApp', (path: string) => {
  cy.window().then((win) => (win as unknown as Required<NextWindow>).next.router!.push(path));
  cy.location('pathname').should('eq', path);
});

Cypress.Commands.add('api', (method, path, { token, body } = {}) =>
  cy.request({
    method,
    url: `${Cypress.expose('apiUrl') as string}${path}`,
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    failOnStatusCode: false,
  }),
);

Cypress.Commands.add('apiLogin', (role: Role) =>
  cy.credentials(role).then((credentials) => {
    cy.takeAuthSlots('auth/login');
    return cy
      .api<{ accessToken: string }>('POST', '/auth/login', { body: credentials })
      .then((response) => {
        expect(response.status, `login as ${role}`).to.eq(200);
        return response.body.accessToken;
      });
  }),
);

/**
 * WCAG 2.1 AA through axe, as the Playwright suites check it: only serious and
 * critical violations fail, the rest are advice.
 */
Cypress.Commands.add('expectAccessible', () => {
  cy.injectAxe();
  cy.checkA11y(
    undefined,
    {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      includedImpacts: ['serious', 'critical'],
    },
    // The command log only shows a count; the report needs what and where.
    (violations) =>
      cy.task(
        'log',
        violations.map(
          ({ id, impact, nodes }) =>
            `${impact} ${id}: ${nodes
              .map(({ target, html }) => `${target.join(' ')} ${html.slice(0, 160)}`)
              .join(', ')}`,
        ),
      ),
  );
});
