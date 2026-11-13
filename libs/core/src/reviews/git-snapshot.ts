import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { basename } from 'node:path';
import { TextDecoder } from 'node:util';

import { bundleSchema, refSchema, type ReviewBundle, revisionSchema } from '@selvedge/contracts';

export function gitEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of [
    'PATH',
    'SystemRoot',
    'WINDIR',
    'TEMP',
    'TMP',
    'TMPDIR',
    'HOME',
    'USERPROFILE',
  ])
    if (process.env[key]) environment[key] = process.env[key];
  return {
    ...environment,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_NO_LAZY_FETCH: '1',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_PAGER: '',
    GIT_OPTIONAL_LOCKS: '0',
  };
}

export function readGit(directory: string, args: string[], signal?: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      [
        '--no-pager',
        '-c',
        'core.fsmonitor=false',
        '-c',
        'core.hooksPath=',
        '-C',
        directory,
        ...args,
      ],
      {
        env: gitEnvironment(),
        stdio: ['ignore', 'pipe', 'ignore'],
        signal,
        timeout: 8000,
        windowsHide: true,
      },
    );
    const parts: Buffer[] = [];
    let bytes = 0;
    child.stdout.on('data', (part: Buffer) => {
      bytes += part.length;
      if (bytes > 512 * 1024) {
        child.kill();
        return;
      }
      parts.push(part);
    });
    child.once('error', reject);
    child.once('close', (code) =>
      code === 0 && bytes <= 512 * 1024
        ? resolve(Buffer.concat(parts))
        : reject(
            new Error('Git could not read this local commit range within the size/time limit.'),
          ),
    );
  });
}

export async function inspectRepository(path: string) {
  const root = await realpath(
    (await readGit(path, ['rev-parse', '--show-toplevel'])).toString('utf8').trim(),
  );
  let organization: string | null = null;
  try {
    const origin = (await readGit(root, ['config', '--get', 'remote.origin.url']))
      .toString()
      .trim();
    organization =
      /^(?:https:\/\/(?:[^/@]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-z0-9][a-z0-9-]{0,99})\//i.exec(
        origin,
      )?.[1] ?? null;
  } catch {
    // Local repositories need no remote or GitHub identity.
  }
  return { root, label: basename(root).slice(0, 240), organization };
}

export async function prepareBundle(
  directory: string,
  baseRef: string,
  headRef: string,
  signal?: AbortSignal,
): Promise<ReviewBundle> {
  const resolve = async (ref: string) =>
    revisionSchema.parse(
      (
        await readGit(
          directory,
          ['rev-parse', '--verify', '--end-of-options', `${refSchema.parse(ref)}^{commit}`],
          signal,
        )
      )
        .toString()
        .trim(),
    );
  const baseSha = await resolve(baseRef);
  const headSha = await resolve(headRef);
  const mergeBaseSha = revisionSchema.parse(
    (await readGit(directory, ['merge-base', baseSha, headSha], signal)).toString().trim(),
  );
  const raw = (
    await readGit(
      directory,
      [
        'diff',
        '--raw',
        '-z',
        '--abbrev=64',
        '--no-renames',
        '--no-ext-diff',
        '--no-textconv',
        mergeBaseSha,
        headSha,
      ],
      signal,
    )
  )
    .toString('utf8')
    .split('\0');
  const files: ReviewBundle['files'] = [];
  const exclusions: ReviewBundle['exclusions'] = [];
  let total = 0;
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const header = raw[index];
    const path = raw[index + 1];
    if (!header || !path) continue;
    const parts = header.slice(1).split(' ');
    const [oldMode, newMode, oldId, newId] = parts;
    if (!oldId || !newId || !oldMode || !newMode) throw new Error('Unsupported Git diff.');
    let reason = '';
    if (
      path.startsWith('/') ||
      path.includes('\\') ||
      path.split('/').some((part) => part === '..' || part === '.') ||
      path.length > 1000
    )
      reason = 'Unsupported path';
    else if (![oldMode, newMode].every((mode) => ['000000', '100644', '100755'].includes(mode)))
      reason = 'Symlink or submodule';
    else if (files.length >= 20) reason = '20-file review limit';
    const texts: string[] = [];
    if (!reason)
      for (const id of [oldId, newId]) {
        if (/^0+$/.test(id)) {
          texts.push('');
          continue;
        }
        revisionSchema.parse(id);
        const size = Number(
          (await readGit(directory, ['cat-file', '-s', id], signal)).toString().trim(),
        );
        if (!Number.isSafeInteger(size) || size > 32768 || total + size > 131072) {
          reason = 'Source context size limit';
          break;
        }
        const bytes = await readGit(directory, ['cat-file', 'blob', id], signal);
        try {
          if (bytes.includes(0)) throw new Error('binary');
          texts.push(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
          total += bytes.length;
        } catch {
          reason = 'Binary or non-UTF-8 content';
          break;
        }
      }
    if (reason) exclusions.push({ path: path.slice(0, 1000), reason });
    else files.push({ path, before: texts[0] ?? '', after: texts[1] ?? '' });
    if (exclusions.length > 1000)
      throw new Error('Commit range is too large. Choose a smaller range.');
  }
  if (files.length === 0)
    throw new Error('No supported text changes. Choose a smaller text-only commit range.');
  return bundleSchema.parse({ target: { baseSha, headSha, mergeBaseSha }, files, exclusions });
}
