import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  isReviewActive,
  requestIdSchema,
  type Review,
  type ReviewCommand,
  reviewCommandSchema,
  reviewDashboardSchema,
  type ReviewSkill,
  targetSchema,
} from '@selvedge/contracts';
import type { NativeClient } from '@skein-js/agent-protocol';
import { z } from 'zod';

import { inspectCodex } from '../reviewers/codex-profile';
import { inspectRepository, prepareBundle } from './git-snapshot';
import { listRepositoryBranches } from './repository-branches';
import { readReviewSkill } from './review-skill';
import { openReviewStore } from './review-store';
import { validateResult } from './validate-result';

interface Options {
  nodeExecutable: string;
  workerEntry: string;
  codexPath?: string;
}

export async function openReviewService(directory: string, client: NativeClient, options: Options) {
  await mkdir(join(directory, 'reviews'), { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await chmod(directory, 0o700);
  const store = openReviewStore(join(directory, 'application.sqlite'));
  const reviewer = await inspectCodex(options.nodeExecutable, options.codexPath);
  const preparations = new Map<string, AbortController>();
  const tasks = new Set<Promise<void>>();
  let stopping = false;

  async function reconcile() {
    for (const review of store.list().filter(isReviewActive)) {
      if (preparations.has(review.id)) continue;
      let saved = store.get(review.id);
      if (!saved) continue;
      let terminal = false;
      try {
        if (!saved.runId) {
          const receipt = await client.getReceipt(review.id);
          store.update(review.id, { status: 'running' }, undefined, receipt.runId);
          saved = store.get(review.id);
        }
        if (!saved?.runId) throw new Error('Missing admission');
        const run = await client.getRun(saved.runId);
        terminal = !['pending', 'running'].includes(run.status);
        if (review.status === 'cancelling') {
          const cancellation = await client.cancel(saved.runId, { wait: true });
          if (cancellation.stopped)
            store.update(review.id, { status: 'cancelled', completedAt: new Date().toISOString() });
          continue;
        }
        if (run.status === 'pending' || run.status === 'running') continue;
        if (!saved.bundle) throw new Error('Missing review input');
        // Adopt an atomically retained result after process loss, even if the run acknowledgement was lost.
        let artifact: unknown;
        try {
          artifact = JSON.parse(
            await readFile(join(directory, 'reviews', review.id, 'result.json'), 'utf8'),
          );
        } catch {
          const failure = JSON.stringify(run.error ?? {});
          const message = /auth|login|401|403/i.test(failure)
            ? 'Codex authentication failed. Run codex login and start a new review.'
            : /quota|429|rate.limit/i.test(failure)
              ? 'Codex quota is unavailable. Check your account before starting a new review.'
              : 'Codex stopped without valid findings. Check its sign-in, quota, and model availability. No automatic retry was made.';
          const status = failure.includes('ProcessLostError') ? 'interrupted' : 'failed';
          if (store.get(review.id)?.review.status === 'running')
            store.update(review.id, {
              status,
              error: message,
              completedAt: new Date().toISOString(),
            });
          continue;
        }
        const parsed = z
          .object({ target: targetSchema, bundleHash: z.string(), result: z.unknown() })
          .parse(artifact);
        const hash = createHash('sha256').update(JSON.stringify(saved.bundle)).digest('hex');
        if (
          JSON.stringify(parsed.target) !== JSON.stringify(saved.bundle.target) ||
          parsed.bundleHash !== hash
        )
          throw new Error('Mismatched review context');
        const result = validateResult(parsed.result, saved.bundle);
        const current = store.get(review.id)?.review;
        if (!current || current.status === 'cancelling' || !isReviewActive(current)) continue;
        store.update(review.id, {
          status: saved.bundle.exclusions.length ? 'partial' : 'completed',
          result,
          completedAt: new Date().toISOString(),
          error: null,
        });
      } catch {
        const current = store.get(review.id)?.review;
        if (!current || !isReviewActive(current)) continue;
        if (current.status === 'cancelling' || (saved?.runId && !terminal))
          throw new Error('Could not confirm review termination. Restart Selvedge to reconnect.');
        store.update(review.id, {
          status: 'interrupted',
          completedAt: new Date().toISOString(),
          error:
            'The review stopped without a validated result. Check Codex sign-in/quota and start a new review; it will not retry automatically.',
        });
      }
    }
  }

  async function execute(command: ReviewCommand, controller: AbortController, skill: ReviewSkill) {
    try {
      const repository = store.repository(command.repositoryId);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
      const bundle = await prepareBundle(repository.path, command.baseRef, command.headRef, signal);
      bundle.skill = skill;
      controller.signal.throwIfAborted();
      const workDirectory = join(directory, 'reviews', command.requestId);
      await mkdir(workDirectory, { recursive: true, mode: 0o700 });
      store.update(
        command.requestId,
        { target: bundle.target, exclusions: bundle.exclusions },
        bundle,
      );
      const receipt = await client.start(
        {
          assistant_id: 'local-review',
          thread_id: command.requestId,
          if_not_exists: 'create',
          input: { bundle, requestId: command.requestId },
          durability: 'sync',
          timeout_ms: 300_000,
          config: {
            configurable: { selvedge: { ...options, codexPath: reviewer.path, workDirectory } },
          },
        },
        { idempotencyKey: command.requestId, idempotencyInput: command },
      );
      store.update(command.requestId, {}, undefined, receipt.runId);
      if (controller.signal.aborted) {
        await client.cancel(receipt.runId, { wait: true });
        return;
      }
      store.update(command.requestId, { status: 'running' }, undefined, receipt.runId);
    } catch (error) {
      if (!['cancelled', 'cancelling'].includes(store.get(command.requestId)?.review.status ?? ''))
        store.update(command.requestId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error:
            error instanceof Error ? error.message.slice(0, 500) : 'Could not prepare the review.',
        });
    } finally {
      preparations.delete(command.requestId);
    }
  }

  await reconcile();
  async function cancelReview(input: string) {
    const id = requestIdSchema.parse(input);
    await reconcile();
    const saved = store.get(id);
    if (!saved || !isReviewActive(saved.review)) return;
    store.update(id, { status: 'cancelling', error: null });
    preparations.get(id)?.abort();
    await Promise.allSettled(tasks);
    const current = store.get(id);
    if (current?.runId) {
      const cancellation = await client.cancel(current.runId, { wait: true });
      if (!cancellation.stopped) throw new Error('Review termination has not been confirmed.');
    }
    store.update(id, { status: 'cancelled', completedAt: new Date().toISOString() });
  }
  return {
    async addRepository(path: string) {
      const { root, label, organization } = await inspectRepository(path);
      return store.addRepository(root, label, organization);
    },
    async importSkill(path: string) {
      return store.importSkill(await readReviewSkill(path));
    },
    async branches(repositoryId: string) {
      return listRepositoryBranches(store.repository(requestIdSchema.parse(repositoryId)).path);
    },
    async dashboard() {
      await reconcile();
      return reviewDashboardSchema.parse({
        repositories: store.repositories(),
        reviews: store.list(),
        skills: store.skills(),
        reviewer: {
          available: reviewer.available,
          version: reviewer.version,
          error: reviewer.error,
        },
      });
    },
    async start(input: z.input<typeof reviewCommandSchema>) {
      const command = reviewCommandSchema.parse(input);
      if (stopping) throw new Error('Selvedge is stopping.');
      const existing = store.get(command.requestId);
      if (existing) {
        if (JSON.stringify(existing.command) !== JSON.stringify(command))
          throw new Error('Request ID already belongs to another review.');
        return existing.review;
      }
      await reconcile();
      const repeated = store.get(command.requestId);
      if (repeated) {
        if (JSON.stringify(repeated.command) !== JSON.stringify(command))
          throw new Error('Request ID already belongs to another review.');
        return repeated.review;
      }
      if (!reviewer.available) throw new Error(reviewer.error ?? 'Codex is unavailable.');
      if (store.list().some(isReviewActive))
        throw new Error('Wait for or cancel the active review first.');
      const repository = store.repository(command.repositoryId);
      const skill = store.skill(command.skillId);
      const review: Review = {
        id: command.requestId,
        repository: {
          id: repository.id,
          label: repository.label,
          organization: repository.organization,
        },
        baseRef: command.baseRef,
        headRef: command.headRef,
        target: null,
        status: 'preparing',
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null,
        exclusions: [],
        error: null,
        codexVersion: reviewer.version,
        skill: { id: skill.id, name: skill.name, digest: skill.digest },
      };
      store.insert(command, review);
      const controller = new AbortController();
      preparations.set(review.id, controller);
      const task = execute(command, controller, skill);
      tasks.add(task);
      void task.finally(() => tasks.delete(task));
      return review;
    },
    cancel: cancelReview,
    async close() {
      stopping = true;
      await reconcile();
      for (const controller of preparations.values()) controller.abort();
      for (const review of store.list().filter(isReviewActive)) {
        await cancelReview(review.id);
      }
      await Promise.allSettled(tasks);
      store.close();
    },
  };
}
