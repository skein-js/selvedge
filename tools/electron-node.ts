import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function runElectronNode(entry: string, args: string[] = []) {
  const binary = (await readFile('node_modules/electron/path.txt', 'utf8')).trim();
  await new Promise<void>((resolveExit, reject) => {
    const child = spawn(
      resolve('node_modules/electron/dist', binary),
      ['--import=tsx', entry, ...args],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          LANGSMITH_TRACING: 'false',
          LANGCHAIN_TRACING_V2: 'false',
        },
      },
    );
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolveExit() : reject(new Error(`Integration checks exited ${code}`)),
    );
  });
}
