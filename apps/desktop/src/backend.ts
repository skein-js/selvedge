import { join } from 'node:path';

import { backendRequestSchema, backendResponseSchema, isReviewActive } from '@selvedge/contracts';
import { openLocalRuntime, openReviewService } from '@selvedge/core';
import { z } from 'zod';

const environment = z
  .object({
    SELVEDGE_DATA_DIRECTORY: z.string().min(1),
    SELVEDGE_NODE_EXECUTABLE: z.string().min(1),
    SELVEDGE_CODEX_PATH: z.string().optional(),
  })
  .parse(process.env);
const parent = process.parentPort;
if (!parent) throw new Error('The runtime must be started as an Electron utility process.');
process.umask(0o077);
const runtime = await openLocalRuntime(
  join(environment.SELVEDGE_DATA_DIRECTORY, 'runtime.sqlite'),
  join(import.meta.dirname, 'graphs/runtime-check.js'),
  join(import.meta.dirname, 'graphs/local-review.js'),
);
const reviews = await openReviewService(environment.SELVEDGE_DATA_DIRECTORY, runtime.nativeClient, {
  nodeExecutable: environment.SELVEDGE_NODE_EXECUTABLE,
  workerEntry: join(import.meta.dirname, 'codex-process.js'),
  codexPath: environment.SELVEDGE_CODEX_PATH,
});

function send(message: unknown) {
  parent?.postMessage(backendResponseSchema.parse(message));
}

parent.on('message', (event: { data: unknown }) => {
  const parsed = backendRequestSchema.safeParse(event.data);
  if (!parsed.success) return;
  const request = parsed.data;
  void (async () => {
    if (request.operation === 'shutdown') {
      await reviews.close();
      await runtime.close();
      process.exit(0);
    }
    let result: unknown;
    switch (request.operation) {
      case 'status':
        result = await runtime.getRuntimeStatus();
        break;
      case 'check':
        if ((await reviews.dashboard()).reviews.some(isReviewActive))
          throw new Error('Wait for the active review before running a diagnostic.');
        result = await runtime.runLocalCheck(request.requestId);
        break;
      case 'repository':
        result = await reviews.addRepository(request.path);
        break;
      case 'reviews':
        result = await reviews.dashboard();
        break;
      case 'branches':
        result = await reviews.branches(request.repositoryId);
        break;
      case 'import-skill':
        result = await reviews.importSkill(request.path);
        break;
      case 'review':
        result = await reviews.start(request.command);
        break;
      case 'cancel-review':
        await reviews.cancel(request.reviewId);
        result = null;
        break;
    }
    send({ type: 'result', id: request.id, result });
  })().catch(() =>
    send({
      type: 'error',
      id: request.id,
      message:
        'The local runtime could not complete this request. Run a new check or restart Selvedge.',
    }),
  );
});
send({ type: 'ready' });
