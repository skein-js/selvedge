import { pathToFileURL } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';
import { embedSqliteGraphs } from '@skein-js/local';
import { createProtocolRuntime } from '@skein-js/agent-protocol';
import type { EmbeddableGraph } from '@skein-js/langgraph';
import { checkResultSchema, requestIdSchema, runtimeStatusSchema } from '@selvedge/contracts';

const threadId = 'e0cf52f9-d820-4d6d-af70-729d07b6f7d5';
const savedStateSchema = z.object({ lastCheckAt: z.iso.datetime().optional() });

const artifactSchema = z.object({
  // Only a host-selected, locally built artifact is loaded. Validate its graph surface
  // before handing the dynamic module export to Skein's typed embedded boundary.
  graph: z.custom<EmbeddableGraph>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      'invoke' in value &&
      typeof value.invoke === 'function' &&
      'stream' in value &&
      typeof value.stream === 'function',
  ),
});

export async function openLocalRuntime(sqlitePath: string, graphPath: string) {
  const module: unknown = await import(pathToFileURL(graphPath).href);
  const { graph } = artifactSchema.parse(module);
  const local = await embedSqliteGraphs({ 'runtime-check': graph }, { sqlitePath });
  const runtime = createProtocolRuntime(local.deps, {
    scheduler: { enabled: false },
    worker: { maxConcurrency: 1, shutdownGraceMs: 3000 },
  });
  try {
    await runtime.service.assistants.registerGraphAssistants();
    runtime.worker.start();
  } catch (error) {
    await local.dispose();
    throw error;
  }
  const client = runtime.createNativeClient({
    sourceId: 'selvedge-local-runtime',
    allowedAssistants: ['runtime-check'],
  });
  let disposal: Promise<void> | undefined;

  return {
    async getRuntimeStatus() {
      const thread = await local.deps.store.threads.get(threadId);
      const state = thread
        ? savedStateSchema.parse((await client.getState(threadId)).values)
        : null;
      return runtimeStatusSchema.parse({
        status: 'ready',
        lastCheckAt: state?.lastCheckAt ?? null,
        error: null,
      });
    },
    async runLocalCheck(input: string) {
      const requestId = requestIdSchema.parse(input);
      const receipt = await client.start(
        {
          thread_id: threadId,
          assistant_id: 'runtime-check',
          if_not_exists: 'create',
          input: { checkedAt: new Date().toISOString() },
          durability: 'sync',
          multitask_strategy: 'enqueue',
          timeout_ms: 9000,
        },
        {
          idempotencyKey: requestId,
          idempotencyInput: { operation: 'runLocalCheck', requestId },
        },
      );
      const deadline = Date.now() + 9500;
      while (Date.now() < deadline) {
        const run = await client.getRun(receipt.runId);
        if (run.status === 'success') {
          const result = await client.getResult(receipt.runId);
          const values = savedStateSchema.parse(result.values);
          return checkResultSchema.parse({ lastCheckAt: values.lastCheckAt, runId: receipt.runId });
        }
        if (run.status !== 'pending' && run.status !== 'running') {
          throw new Error(`Local check ended with ${run.status}. Run a new check to retry.`);
        }
        await setTimeout(20);
      }
      await client.cancel(receipt.runId, { wait: true });
      throw new Error('Local check exceeded its deadline.');
    },
    close() {
      disposal ??= (async () => {
        try {
          await runtime.worker.stop();
        } finally {
          await local.dispose();
        }
      })();
      return disposal;
    },
  };
}
