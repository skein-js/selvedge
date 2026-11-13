import { spawn } from 'node:child_process';
import { access, realpath } from 'node:fs/promises';
import { delimiter, extname, join } from 'node:path';

import { z } from 'zod';

export const executionSchema = z.strictObject({
  nodeExecutable: z.string().min(1),
  workerEntry: z.string().min(1),
  codexPath: z.string().min(1),
  workDirectory: z.string().min(1),
});
export type Execution = z.infer<typeof executionSchema>;
const disabledFeatures = [
  'shell_tool',
  'unified_exec',
  'code_mode',
  'code_mode_host',
  'hooks',
  'apps',
  'plugins',
  'remote_plugin',
  'plugin_discovery_prefetch',
  'multi_agent',
  'multi_agent_v2',
  'browser_use',
  'browser_use_external',
  'image_generation',
  'view_image',
  'skill_search',
  'goals',
  'skill_mcp_dependency_install',
];

export function providerEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of [
    'PATH',
    'HOME',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'SystemRoot',
    'WINDIR',
    'TMPDIR',
    'TMP',
    'TEMP',
    'LANG',
    'CODEX_HOME',
  ])
    if (process.env[key]) environment[key] = process.env[key];
  return { ...environment, ELECTRON_RUN_AS_NODE: '1' };
}

export function codexCommand(path: string, nodeExecutable: string) {
  return /\.[cm]?js$/.test(extname(path))
    ? { executable: nodeExecutable, prefix: [path] }
    : { executable: path, prefix: [] };
}

async function probe(path: string, nodeExecutable: string, args: string[], signal: AbortSignal) {
  const command = codexCommand(path, nodeExecutable);
  return new Promise<string>((resolve, reject) => {
    let output = '';
    const child = spawn(command.executable, [...command.prefix, ...args], {
      env: providerEnvironment(),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
      signal,
      windowsHide: true,
    });
    child.stdout.on('data', (data: Buffer) => {
      output += data.toString();
      if (output.length > 32768) child.kill();
    });
    child.once('error', reject);
    child.once('close', (code) =>
      code === 0 && output.length <= 32768
        ? resolve(output)
        : reject(new Error('Could not inspect Codex CLI.')),
    );
  });
}

export async function inspectCodex(nodeExecutable: string, configured?: string) {
  const signal = AbortSignal.timeout(4000);
  const directories = [
    ...(process.env['PATH'] ?? '').split(delimiter),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ];
  const candidates = configured
    ? [configured]
    : directories.map((directory) =>
        join(directory, process.platform === 'win32' ? 'codex.exe' : 'codex'),
      );
  for (const candidate of candidates) {
    if (signal.aborted) break;
    try {
      await access(candidate);
      const path = await realpath(candidate);
      const version = (await probe(path, nodeExecutable, ['--version'], signal)).trim();
      if (version !== 'codex-cli 0.167.0')
        return {
          available: false,
          version,
          error:
            'This preview supports Codex CLI 0.167.0. Configure SELVEDGE_CODEX_PATH with a supported installation.',
          path,
        };
      const features = await probe(path, nodeExecutable, ['features', 'list'], signal);
      if (!disabledFeatures.every((name) => new RegExp(`^${name}\\s+`, 'm').test(features)))
        return {
          available: false,
          version,
          error: 'Codex is missing required safety controls.',
          path,
        };
      return { available: true, version, error: null, path };
    } catch {
      /* Try the next installed native executable; never install or sign in here. */
    }
  }
  return {
    available: false,
    version: null,
    error:
      'Install and sign in to Codex CLI 0.167.0, then restart Selvedge. Set SELVEDGE_CODEX_PATH if it is not on PATH.',
    path: '',
  };
}

export function codexArguments(schema: string, directory: string) {
  return [
    '--no-daemon',
    '--ask-for-approval',
    'never',
    'exec',
    '--ignore-user-config',
    '--ignore-rules',
    '--strict-config',
    '--ephemeral',
    '--skip-git-repo-check',
    '--sandbox',
    'read-only',
    ...disabledFeatures.flatMap((name) => ['--disable', name]),
    '-c',
    'web_search="disabled"',
    '-c',
    'project_doc_max_bytes=0',
    '-c',
    'mcp_servers={}',
    '--cd',
    directory,
    '--output-schema',
    schema,
    '--json',
    '-',
  ];
}
