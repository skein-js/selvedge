import { readdir, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export async function packagedApp() {
  const entries = await readdir('out', { withFileTypes: true });
  const entry = entries.find(
    (item) => item.isDirectory() && item.name.endsWith(`${process.platform}-${process.arch}`),
  );
  if (!entry) throw new Error('No packaged application found. Run pnpm package first.');
  const directory = resolve('out', entry.name);
  const executable =
    process.platform === 'darwin'
      ? join(directory, 'Selvedge.app/Contents/MacOS/selvedge')
      : join(directory, process.platform === 'win32' ? 'selvedge.exe' : 'selvedge');
  return { directory, executable };
}

export async function directoryBytes(path: string): Promise<number> {
  const information = await lstat(path);
  if (information.isSymbolicLink()) return 0;
  if (!information.isDirectory()) return information.size;
  const entries = await readdir(path);
  const sizes = await Promise.all(entries.map((entry) => directoryBytes(join(path, entry))));
  return sizes.reduce((sum, value) => sum + value, 0);
}
