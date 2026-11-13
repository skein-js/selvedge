import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
if (process.argv.includes('--version')) {
  console.log('codex-cli 0.167.0');
  process.exit(0);
}
if (process.argv.includes('features')) {
  for (const name of [
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
  ])
    console.log(`${name} stable true`);
  process.exit(0);
}
let prompt = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => (prompt += data));
process.stdin.on('end', () => {
  const { bundle, reviewSkill } = JSON.parse(prompt);
  writeFileSync(join(root, 'last-skill.json'), JSON.stringify(reviewSkill));
  appendFileSync(join(root, 'calls'), 'review\n');
  const mode = readFileSync(join(root, 'mode'), 'utf8').trim();
  if (mode === 'hang') {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: 'ignore',
      env: process.env,
    });
    writeFileSync(join(root, 'pids.json'), JSON.stringify([process.pid, child.pid]));
    setInterval(() => {}, 1000);
    return;
  }
  const file = bundle.files.find((file) => file.path === 'sample.ts');
  const result = {
    summary: 'Manual review fixture — saved',
    findings: [
      {
        severity: 'high',
        file: mode === 'bad-reference' ? '../outside.ts' : file.path,
        side: 'after',
        startLine: 1,
        endLine: 1,
        explanation: 'Division by zero returns an invalid result.',
        suggestion: 'Use a validated nonzero divisor.',
      },
    ],
  };
  console.log(
    JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: JSON.stringify(result) },
    }),
  );
  console.log(
    JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 0, output_tokens: 0 } }),
  );
});
