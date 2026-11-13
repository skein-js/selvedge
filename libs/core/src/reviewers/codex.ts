import { fork } from 'node:child_process';

import { type AgentResult, agentResultSchema, type ReviewBundle } from '@selvedge/contracts';
import { z } from 'zod';

import { type Execution, providerEnvironment } from './codex-profile';

export function reviewWithCodex(
  bundle: ReviewBundle,
  execution: Execution,
  signal?: AbortSignal,
): Promise<AgentResult> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = fork(execution.workerEntry, [], {
      execArgv: [],
      execPath: execution.nodeExecutable,
      env: providerEnvironment(),
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    });
    let result: AgentResult | undefined;
    let error: Error | undefined;
    worker.stderr?.on('data', () => {
      /* Drain bounded-by-process diagnostics without retaining private context. */
    });
    const cancel = () => {
      error ??= new Error('Review cancelled or interrupted.');
      if (worker.connected) worker.disconnect();
    };
    const deadline = setTimeout(cancel, 301_000);
    signal?.addEventListener('abort', cancel, { once: true });
    worker.on('message', (input: unknown) => {
      const parsed = z
        .discriminatedUnion('type', [
          z.strictObject({ type: z.literal('result'), result: agentResultSchema }),
          z.strictObject({ type: z.literal('error'), message: z.string().max(500) }),
        ])
        .safeParse(input);
      if (!parsed.success) {
        error = new Error('Invalid response from review supervisor.');
        cancel();
      } else if (parsed.data.type === 'error') error = new Error(parsed.data.message);
      else result = parsed.data.result;
    });
    worker.once('error', () => {
      error = new Error('Could not start the local review supervisor.');
    });
    worker.once('close', () => {
      clearTimeout(deadline);
      signal?.removeEventListener('abort', cancel);
      if (!error && result) resolve(result);
      else reject(error ?? new Error('Review supervisor stopped before confirming completion.'));
    });
    worker.send({ type: 'start', bundle, execution }, (failure) => {
      if (failure) {
        error = new Error('Could not deliver the review context.');
        cancel();
      }
    });
    if (signal?.aborted) cancel();
  });
}
