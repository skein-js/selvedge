import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export function runNode(entry: string, args: string[] = []): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [entry, ...args], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun();
      else reject(new Error(`${entry} exited with ${code ?? signal}`));
    });
  });
}

export function runNx(args: string[]): Promise<void> {
  return runNode(resolve('node_modules/nx/dist/bin/nx.js'), args);
}
