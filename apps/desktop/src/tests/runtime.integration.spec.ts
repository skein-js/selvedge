import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { openLocalRuntime, openReviewService } from '@selvedge/core';
import { expect, it } from 'vitest';

import { confirmStopped, createReviewFixture, waitForPids } from './fixtures/review-fixture';

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

it('retains SHA-pinned private reviews without duplicate calls, rejects invalid findings, and cancels the owned process tree', async () => {
  const fixture = await createReviewFixture();
  const data = join(fixture.directory, 'data');
  let runtime: Awaited<ReturnType<typeof openLocalRuntime>> | undefined;
  let service: Awaited<ReturnType<typeof openReviewService>> | undefined;
  const start = async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(data, { recursive: true });
    runtime = await openLocalRuntime(
      join(data, 'runtime.sqlite'),
      resolve('dist/desktop/graphs/runtime-check.js'),
      resolve('dist/desktop/graphs/local-review.js'),
    );
    service = await openReviewService(data, runtime.nativeClient, {
      nodeExecutable: process.execPath,
      workerEntry: resolve('dist/desktop/codex-process.js'),
      codexPath: fixture.codexPath,
    });
    return service;
  };
  const waitForResult = async (
    current: Awaited<ReturnType<typeof openReviewService>>,
    id: string,
  ) => {
    for (let attempt = 0; attempt < 150; attempt++) {
      const review = (await current.dashboard()).reviews.find((review) => review.id === id);
      if (review && !['preparing', 'running'].includes(review.status)) return review;
      await setTimeout(30);
    }
    throw new Error('Review did not complete.');
  };
  try {
    let current = await start();
    fixture.git('remote', 'add', 'origin', 'git@github.com:skein-js/repository.git');
    const repository = await current.addRepository(fixture.repository);
    expect(repository.organization).toBe('skein-js');
    fixture.git('branch', 'fix/é#1', fixture.baseSha);
    const branches = await current.branches(repository.id);
    expect(branches.currentRef).toBe('refs/heads/feature/local-review');
    expect(branches.defaultBaseRef).toBe('refs/heads/main');
    expect(branches.branches).toContainEqual({ ref: 'refs/heads/fix/é#1', label: 'fix/é#1' });
    const skillPath = join(fixture.provider, 'SKILL.md');
    const instructions = '# Review guidance\nFocus on arithmetic correctness.\n';
    await writeFile(skillPath, instructions);
    const skill = await current.importSkill(skillPath);
    const command = {
      requestId: randomUUID(),
      repositoryId: repository.id,
      baseRef: 'refs/heads/main',
      headRef: 'refs/heads/feature/local-review',
      skillId: skill.id,
    };
    const [first, duplicate] = await Promise.all([current.start(command), current.start(command)]);
    expect(duplicate.id).toBe(first.id);
    const result = await waitForResult(current, command.requestId);
    expect(result.status).toBe('partial');
    expect(result.result?.summary).toBe('Manual review fixture — saved');
    expect(result.skill).toEqual(skill);
    expect(
      JSON.parse(await readFile(join(fixture.provider, 'last-skill.json'), 'utf8')),
    ).toMatchObject({ ...skill, instructions });
    expect(result.target).toEqual({
      baseSha: fixture.baseSha,
      headSha: fixture.headSha,
      mergeBaseSha: fixture.baseSha,
    });
    expect(result.exclusions).toContainEqual({
      path: 'binary.dat',
      reason: 'Binary or non-UTF-8 content',
    });
    expect(fixture.git('status', '--porcelain')).toBe(fixture.status);
    await current.close();
    await runtime?.close();
    current = await start();
    await writeFile(skillPath, '# Changed guidance\nFocus on security.\n');
    const updated = await current.importSkill(skillPath);
    expect(updated.id).toBe(skill.id);
    expect(updated.digest).not.toBe(skill.digest);
    expect((await current.start(command)).skill).toEqual(skill);
    expect((await current.start(command)).result).toEqual(result.result);
    expect(await readFile(join(fixture.provider, 'calls'), 'utf8')).toBe('review\n');
    await writeFile(join(fixture.provider, 'mode'), 'bad-reference');
    const invalid = await current.start({ ...command, requestId: randomUUID() });
    expect((await waitForResult(current, invalid.id)).result).toBeNull();
    await writeFile(join(fixture.provider, 'mode'), 'hang');
    const pending = await current.start({ ...command, requestId: randomUUID() });
    const pids = await waitForPids(fixture.provider);
    await current.cancel(pending.id);
    await confirmStopped(pids);
    expect(
      (await current.dashboard()).reviews.find((review) => review.id === pending.id)?.status,
    ).toBe('cancelled');
  } finally {
    await service?.close();
    await runtime?.close();
    await rm(fixture.directory, { recursive: true, force: true });
  }
}, 30_000);
