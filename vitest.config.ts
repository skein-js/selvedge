import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/**/tests/**/*.spec.ts', 'libs/**/tests/**/*.spec.ts'],
    exclude: ['**/*.integration.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@selvedge/contracts': fileURLToPath(
        new URL('./libs/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
});
