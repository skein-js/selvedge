import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

async function markdownFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const child = join(path, entry.name);
      return entry.isDirectory()
        ? markdownFiles(child)
        : Promise.resolve(child.endsWith('.md') ? [child] : []);
    }),
  );
  return files.flat();
}

const files = ['README.md', 'AGENTS.md', ...(await markdownFiles('docs'))];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (!target || /^(https?:|#)/.test(target)) continue;
    const local = target.split('#')[0];
    if (local) await stat(resolve(dirname(file), local));
  }
}
console.log(`Local links checked in ${files.length} Markdown files.`);
