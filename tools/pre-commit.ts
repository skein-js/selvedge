import { execFileSync } from 'node:child_process';
import prettier from 'prettier';
import { runNx } from './process.ts';

const paths = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean);
for (const path of paths) {
  const information = await prettier.getFileInfo(path, { ignorePath: '.prettierignore' });
  if (information.ignored || !information.inferredParser) continue;
  const content = execFileSync('git', ['show', `:${path}`], { encoding: 'utf8' });
  const configuration = await prettier.resolveConfig(path);
  if (!(await prettier.check(content, { ...configuration, filepath: path }))) {
    throw new Error(`Staged formatting needs attention: ${path}. No files were modified.`);
  }
}
if (paths.some((path) => !/^(docs\/.*\.md|README\.md|AGENTS\.md)$/.test(path))) {
  await runNx(['affected', '-t', 'lint', 'typecheck', 'test', `--files=${paths.join(',')}`]);
}
