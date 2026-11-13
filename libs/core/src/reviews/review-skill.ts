import { createHash } from 'node:crypto';
import { open, realpath } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { TextDecoder } from 'node:util';

import { defaultSkillId, reviewSkillSchema } from '@selvedge/contracts';

export const defaultInstructions =
  'Review for actionable correctness, security, and data-integrity defects. Prioritize meaningful findings over style preferences. Explain the trigger and impact and suggest a concrete correction. Do not invent missing context.';

export function skillDigest(instructions: string) {
  return createHash('sha256').update(instructions).digest('hex');
}

export const defaultSkill = reviewSkillSchema.parse({
  id: defaultSkillId,
  name: 'General review',
  instructions: defaultInstructions,
  digest: skillDigest(defaultInstructions),
});

export async function readReviewSkill(path: string) {
  if (basename(path) !== 'SKILL.md') throw new Error('Choose a SKILL.md file.');
  const canonical = await realpath(path);
  const file = await open(canonical, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 16384)
      throw new Error('Select a regular UTF-8 SKILL.md file no larger than 16 KiB.');
    const buffer = Buffer.alloc(16385);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const next = await file.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!next.bytesRead) break;
      bytesRead += next.bytesRead;
    }
    if (bytesRead > 16384) throw new Error('Skill file exceeds 16 KiB.');
    const instructions = new TextDecoder('utf8', { fatal: true }).decode(
      buffer.subarray(0, bytesRead),
    );
    if (!instructions.trim() || instructions.includes('\0'))
      throw new Error('Skill is empty or binary.');
    // Keep the complete document, including frontmatter, as text. Never load adjacent resources.
    return {
      path: canonical,
      name: basename(dirname(canonical)).slice(0, 100) || 'Imported skill',
      instructions,
      digest: skillDigest(instructions),
    };
  } finally {
    await file.close();
  }
}
