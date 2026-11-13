import { createHash } from 'node:crypto';
import { open, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { RunnableConfig } from '@langchain/core/runnables';
import { bundleSchema, type ReviewBundle } from '@selvedge/contracts';

import { reviewWithCodex } from '../reviewers/codex';
import { executionSchema } from '../reviewers/codex-profile';
import { openReviewStore } from './review-store';
import { validateResult } from './validate-result';

export async function executeReview(
  input: { bundle: ReviewBundle; requestId: string },
  config: RunnableConfig,
) {
  const execution = executionSchema.parse(config.configurable?.['selvedge']);
  const bundle = bundleSchema.parse(input.bundle);
  const store = openReviewStore(
    join(dirname(dirname(execution.workDirectory)), 'application.sqlite'),
  );
  try {
    const review = store.get(input.requestId)?.review;
    if (!review || !['preparing', 'running'].includes(review.status))
      throw new Error('Review is no longer eligible.');
  } finally {
    store.close();
  }
  // Exclusive admission marker prevents a checkpoint replay from spending another agent call.
  const claim = await open(join(execution.workDirectory, 'started'), 'wx', 0o600);
  await claim.close();
  const result = validateResult(await reviewWithCodex(bundle, execution, config.signal), bundle);
  config.signal?.throwIfAborted();
  const temporary = join(execution.workDirectory, 'result.tmp');
  const bundleHash = createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
  await writeFile(temporary, JSON.stringify({ target: bundle.target, bundleHash, result }), {
    mode: 0o600,
  });
  await rename(temporary, join(execution.workDirectory, 'result.json'));
  return { result };
}
