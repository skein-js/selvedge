import { join } from 'node:path';
import { z } from 'zod';
import { openLocalRuntime } from '@selvedge/core';
import { backendRequestSchema, backendResponseSchema } from '@selvedge/contracts';

const environment = z.object({ SELVEDGE_DATA_DIRECTORY: z.string().min(1) }).parse(process.env);
const parent = process.parentPort;
if (!parent) throw new Error('The runtime must be started as an Electron utility process.');
const runtime = await openLocalRuntime(
  join(environment.SELVEDGE_DATA_DIRECTORY, 'runtime.sqlite'),
  join(import.meta.dirname, 'graphs/runtime-check.js'),
);

function send(message: unknown) {
  parent?.postMessage(backendResponseSchema.parse(message));
}

parent.on('message', (event: { data: unknown }) => {
  const parsed = backendRequestSchema.safeParse(event.data);
  if (!parsed.success) return;
  const request = parsed.data;
  void (async () => {
    if (request.operation === 'shutdown') {
      await runtime.close();
      process.exit(0);
    }
    const result =
      request.operation === 'status'
        ? await runtime.getRuntimeStatus()
        : await runtime.runLocalCheck(request.requestId);
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
