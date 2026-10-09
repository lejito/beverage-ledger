import { vi } from 'vitest';

/** What `next/navigation` hands the components under test; reset after each test. */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const location = {
  pathname: '/',
  searchParams: new URLSearchParams(),
};

export function resetNavigation(): void {
  Object.values(router).forEach((spy) => spy.mockReset());
  location.pathname = '/';
  location.searchParams = new URLSearchParams();
}
