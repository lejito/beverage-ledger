import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

process.env = { ...process.env, ...loadEnv('test', process.cwd(), '') };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    },
    // e2e/ belongs to Playwright: none of these projects may pick up its specs.
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/*.test.{ts,tsx}'] } },
      {
        extends: true,
        test: {
          name: 'funcional',
          include: ['tests/regression/funcional/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/support/setup-screens.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'seguridad',
          include: ['tests/regression/seguridad/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/support/setup-screens.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // Whitelist, not discovery: only the modules a test actually executes.
      // Mirrored by sonar.coverage.exclusions in sonar-project.properties.
      include: [
        'src/config/api.ts',
        'src/config/navigation.ts',
        'src/features/admin/api.ts',
        'src/features/admin/audit-actions.ts',
        'src/features/admin/roles.ts',
        'src/features/catalog/api.ts',
        'src/features/invitations/api.ts',
        'src/features/movements/open-draft.ts',
        'src/features/movements/useMovementDraft.ts',
        'src/features/profile/api.ts',
        'src/features/reports/range.ts',
        'src/features/stock/low-stock.ts',
        'src/features/stock/quantity.ts',
        'src/lib/api/client.ts',
        'src/lib/api/errors.ts',
        'src/lib/api/refresh.ts',
        'src/lib/api/session.ts',
        'src/lib/forms/rules.ts',
        'src/lib/forms/useFormValidation.ts',
        'src/lib/hooks/pagination.ts',
        'src/lib/hooks/useDebouncedValue.ts',
      ],
    },
  },
});
