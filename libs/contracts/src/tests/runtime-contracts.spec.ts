import { describe, expect, it } from 'vitest';
import { backendRequestSchema } from '../runtime-contracts';

describe('runtime admission boundary', () => {
  const request = {
    operation: 'check',
    id: '163945cf-c0d1-4b52-9fb3-927552adfd57',
    requestId: '7c5c4e66-a8df-459c-a32e-e79da248a7fe',
  };

  it('rejects arbitrary operations, invalid identities, and injected authority', () => {
    expect(backendRequestSchema.safeParse(request).success).toBe(true);
    for (const input of [
      { ...request, operation: 'execute' },
      { ...request, requestId: '../../source' },
      { ...request, command: 'sh repository-script', sqlitePath: '/private/data.sqlite' },
    ])
      expect(backendRequestSchema.safeParse(input).success).toBe(false);
  });
});
