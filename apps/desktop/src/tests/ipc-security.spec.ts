import { describe, expect, it } from 'vitest';
import { isTrustedSender } from '../ipc-security';

describe('IPC sender authorization', () => {
  const expected = { contentsId: 4, url: 'file:///application/index.html' };

  it('accepts only the expected window, top frame, and exact document', () => {
    expect(isTrustedSender({ ...expected, topFrame: true }, expected)).toBe(true);
    for (const sender of [
      { ...expected, contentsId: 5, topFrame: true },
      { ...expected, topFrame: false },
      { ...expected, url: 'https://attacker.invalid/', topFrame: true },
      { ...expected, url: `${expected.url}?redirect=1`, topFrame: true },
    ])
      expect(isTrustedSender(sender, expected)).toBe(false);
  });
});
