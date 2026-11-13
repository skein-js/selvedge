import './check-doc-links.ts';

import { runNx } from './process.ts';

for (const args of [
  ['run', 'desktop:format-check'],
  ['run-many', '-t', 'lint', 'typecheck'],
  ['run', 'desktop:test'],
  ['run', 'desktop:test-integration'],
  ['run', 'desktop:smoke'],
])
  await runNx(args);
