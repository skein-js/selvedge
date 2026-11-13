import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { z } from 'zod';

export async function createReviewFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'selvedge-review-'));
  const repository = join(directory, 'repository');
  const provider = join(directory, 'provider');
  await mkdir(repository);
  await mkdir(provider);
  const codexPath = join(provider, 'fake-codex.mjs');
  await cp(resolve('apps/desktop/src/tests/fixtures/fake-codex.mjs'), codexPath);
  await writeFile(join(provider, 'mode'), 'success');
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Selvedge fixture',
        '-c',
        'user.email=fixture@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=',
        ...args,
      ],
      { cwd: repository, encoding: 'utf8' },
    ).trim();
  git('init', '-q', '-b', 'main');
  await writeFile(join(repository, 'sample.ts'), 'export const total = 10;\n');
  git('add', '.');
  git('commit', '-qm', 'fixture base');
  const baseSha = git('rev-parse', 'HEAD');
  git('checkout', '-qb', 'feature/local-review');
  await writeFile(join(repository, 'sample.ts'), 'export const total = 10 / 0;\n');
  await writeFile(join(repository, 'binary.dat'), Buffer.from([0, 1, 2]));
  await mkdir(join(repository, '.codex'));
  await writeFile(
    join(repository, '.codex/config.toml'),
    '# Untrusted repository configuration; never load it.\n',
  );
  git('add', '.');
  git('commit', '-qm', 'fixture changes');
  const headSha = git('rev-parse', 'HEAD');
  git('config', 'diff.external', 'must-not-run-untrusted-diff');
  const status = git('status', '--porcelain');
  return { directory, repository, provider, codexPath, baseSha, headSha, status, git };
}

export async function waitForPids(provider: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      return z
        .array(z.number().int())
        .parse(JSON.parse(await readFile(join(provider, 'pids.json'), 'utf8')));
    } catch {
      await setTimeout(25);
    }
  }
  throw new Error('Fixture CLI did not start.');
}

function running(pid: number) {
  try {
    process.kill(pid, 0);
    if (process.platform !== 'win32') {
      const status = spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], {
        encoding: 'utf8',
      }).stdout.trim();
      if (status.startsWith('Z')) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function confirmStopped(pids: number[]) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (pids.every((pid) => !running(pid))) return;
    await setTimeout(25);
  }
  throw new Error('An owned reviewer process survived termination.');
}
