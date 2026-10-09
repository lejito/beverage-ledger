import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { forgetSession } from '@/lib/api/session';
import { fakeApi } from './fake-api';
import { resetNavigation } from './navigation';

// openapi-fetch captures `globalThis.fetch` when the client is created, at import
// time, so the fake has to be in place before any test file imports the client.
globalThis.fetch = fakeApi.fetch as typeof fetch;

vi.mock('next/navigation', async () => {
  const navigation = await import('./navigation');
  return {
    useRouter: () => navigation.router,
    usePathname: () => navigation.location.pathname,
    useSearchParams: () => navigation.location.searchParams,
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  forgetSession();
  fakeApi.reset();
  resetNavigation();
  localStorage.clear();
  sessionStorage.clear();
});
