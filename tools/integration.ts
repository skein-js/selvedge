import { runElectronNode } from './electron-node.ts';

await runElectronNode('node_modules/vitest/vitest.mjs', [
  'run',
  '--config',
  'vitest.integration.config.ts',
]);
