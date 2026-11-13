import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { runNx } from './process.ts';

await runNx(['run', 'desktop:build']);
await runNx(['run', 'desktop:native-rebuild']);
const server = spawn(process.execPath, ['node_modules/nx/dist/bin/nx.js', 'serve', 'renderer'], {
  stdio: 'inherit',
});
const origin = 'http://127.0.0.1:4200';
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for the initial Angular compilation. */
    }
    if (server.exitCode !== null) throw new Error('Renderer development server stopped.');
    await setTimeout(500);
  }
  if (!ready) throw new Error('Renderer development server did not become ready.');
  const binary = (await readFile('node_modules/electron/path.txt', 'utf8')).trim();
  const child = spawn(resolve('node_modules/electron/dist', binary), ['.'], {
    stdio: 'inherit',
    env: { ...process.env, SELVEDGE_RENDERER_URL: origin },
  });
  const stop = () => {
    child.kill();
    server.kill();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  await new Promise<void>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolveExit() : reject(new Error(`Electron exited ${code}`)),
    );
  });
} finally {
  server.kill();
}
