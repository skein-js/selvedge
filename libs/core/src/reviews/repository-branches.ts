import { TextDecoder } from 'node:util';

import { repositoryBranchesSchema } from '@selvedge/contracts';

import { readGit } from './git-snapshot';

export async function listRepositoryBranches(directory: string) {
  const bytes = await readGit(directory, [
    'for-each-ref',
    '--count=1001',
    '--format=%(refname)%00%(symref)%00%(HEAD)',
    'refs/heads',
    'refs/remotes',
  ]);
  const lines = new TextDecoder('utf8', { fatal: true }).decode(bytes).split('\n').filter(Boolean);
  if (lines.length > 1000) throw new Error('This preview supports up to 1,000 branch references.');
  const branches: { ref: string; label: string }[] = [];
  let currentRef: string | null = null;
  let originHead: string | null = null;
  for (const line of lines) {
    const [ref, symbolic, current] = line.split('\0');
    if (!ref) continue;
    if (ref === 'refs/remotes/origin/HEAD' && symbolic) originHead = symbolic;
    if (symbolic) continue;
    if (current === '*') currentRef = ref;
    branches.push({ ref, label: ref.replace(/^refs\/(heads|remotes)\//, '') });
  }
  const preferred = [
    originHead,
    'refs/heads/main',
    'refs/heads/master',
    'refs/remotes/origin/main',
    'refs/remotes/origin/master',
  ];
  const defaultBaseRef =
    preferred.find((ref) => branches.some((branch) => branch.ref === ref)) ??
    branches.find((branch) => branch.ref !== currentRef)?.ref ??
    branches[0]?.ref ??
    null;
  return repositoryBranchesSchema.parse({ branches, currentRef, defaultBaseRef });
}
