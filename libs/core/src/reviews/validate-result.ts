import { agentResultSchema, type ReviewBundle } from '@selvedge/contracts';

export function validateResult(input: unknown, bundle: ReviewBundle) {
  const result = agentResultSchema.parse(input);
  for (const finding of result.findings) {
    const file = bundle.files.find((file) => file.path === finding.file);
    if (!file) throw new Error('Codex referenced a file outside the prepared review.');
    const text = file[finding.side];
    const lines = text ? text.split('\n').length - (text.endsWith('\n') ? 1 : 0) : 0;
    if (finding.endLine < finding.startLine || finding.endLine > lines)
      throw new Error('Codex returned an invalid source reference.');
  }
  return result;
}
