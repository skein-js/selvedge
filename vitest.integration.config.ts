import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/**/tests/**/*.integration.spec.ts'],
    environment: 'node',
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@selvedge/core': fileURLToPath(new URL('./libs/core/src/index.ts', import.meta.url)),
      '@selvedge/contracts': fileURLToPath(
        new URL('./libs/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
});
