import { cp, mkdir, rm } from 'node:fs/promises';

import { build } from 'esbuild';

await rm('dist/desktop', { recursive: true, force: true });
await mkdir('dist/desktop/graphs', { recursive: true });
await build({
  entryPoints: {
    main: 'apps/desktop/src/main.ts',
    backend: 'apps/desktop/src/backend.ts',
    'codex-process': 'libs/core/src/reviewers/codex-process.ts',
  },
  outdir: 'dist/desktop',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  bundle: true,
  sourcemap: true,
  external: ['electron', '@skein-js/*', '@langchain/*', 'better-sqlite3'],
});
await build({
  entryPoints: ['apps/desktop/src/preload.ts'],
  outfile: 'dist/desktop/preload.cjs',
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  bundle: true,
  external: ['electron'],
});
await cp('libs/core/.skein/build/graphs/runtime-check.js', 'dist/desktop/graphs/runtime-check.js');
await cp(
  'libs/core/.skein/build/graphs/runtime-check.js.map',
  'dist/desktop/graphs/runtime-check.js.map',
);
await cp('apps/desktop/src/assets/tray.png', 'dist/desktop/tray.png');
await cp('libs/core/.skein/build/chunks', 'dist/desktop/chunks', { recursive: true });
await cp('libs/core/.skein/build/graphs/local-review.js', 'dist/desktop/graphs/local-review.js');
await cp(
  'libs/core/.skein/build/graphs/local-review.js.map',
  'dist/desktop/graphs/local-review.js.map',
);
