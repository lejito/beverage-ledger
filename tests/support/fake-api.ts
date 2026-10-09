type Handler = (request: Request, url: URL) => Response | Promise<Response>;

export const json = (status: number, body?: unknown): Response =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** The error shape the API's global filter gives every failure. */
export const apiError = (status: number, message: string, path = '/'): Response =>
  json(status, { statusCode: status, error: 'Error', message, path, timestamp: '' });

/**
 * An in-memory stand-in for the API, installed as `globalThis.fetch` so the real
 * client, hooks and components run on top of it. Routes are `METHOD /path`,
 * without the query string; an unrouted request answers 404 and stays in
 * `calls`, so a test can tell a request it did not expect from one that failed.
 */
export function createFakeApi() {
  const routes = new Map<string, Handler>();
  const calls: { method: string; path: string; url: URL; body: unknown }[] = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const text = request.body ? await request.clone().text() : '';
    calls.push({
      method: request.method,
      path: url.pathname,
      url,
      body: text ? JSON.parse(text) : undefined,
    });

    const handler = routes.get(`${request.method} ${url.pathname}`);
    return handler
      ? handler(request, url)
      : apiError(404, 'Not routed in the fake API', url.pathname);
  };

  return {
    fetch,
    calls,
    on(route: string, handler: Handler | Response) {
      routes.set(route, typeof handler === 'function' ? handler : () => handler.clone());
    },
    callsTo(route: string) {
      const [method, path] = route.split(' ');
      return calls.filter((call) => call.method === method && call.path === path);
    },
    reset() {
      routes.clear();
      calls.length = 0;
    },
  };
}

export const fakeApi = createFakeApi();
