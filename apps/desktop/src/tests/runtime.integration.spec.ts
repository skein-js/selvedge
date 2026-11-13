import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { openLocalRuntime } from '@selvedge/core';

it('deduplicates admission, enforces ownership, and restores state and receipts after reopening', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'selvedge-runtime-'));
  const database = join(directory, 'runtime.sqlite');
  const graph = resolve('dist/desktop/graphs/runtime-check.js');
  let runtime: Awaited<ReturnType<typeof openLocalRuntime>> | undefined;
  try {
    runtime = await openLocalRuntime(database, graph);
    expect((await runtime.getRuntimeStatus()).lastCheckAt).toBeNull();
    const requestId = randomUUID();
    const [first, duplicate] = await Promise.all([
      runtime.runLocalCheck(requestId),
      runtime.runLocalCheck(requestId),
    ]);
    expect(duplicate).toEqual(first);
    await expect(openLocalRuntime(database, graph)).rejects.toThrow();
    await runtime.close();
    runtime = await openLocalRuntime(database, graph);
    expect((await runtime.getRuntimeStatus()).lastCheckAt).toBe(first.lastCheckAt);
    expect(await runtime.runLocalCheck(requestId)).toEqual(first);
  } finally {
    await runtime?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
