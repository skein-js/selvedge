import { runNx } from './process.ts';
import './check-doc-links.ts';

for (const args of [
  ['run', 'desktop:format-check'],
  ['run-many', '-t', 'lint', 'typecheck'],
  ['run', 'desktop:test'],
  ['run', 'desktop:test-integration'],
  ['run', 'desktop:smoke'],
])
  await runNx(args);
