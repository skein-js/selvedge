import type { DestroyRef } from '@angular/core';
import type { ReviewDashboard } from '@selvedge/contracts';
import { expect, it, vi } from 'vitest';

import { LocalReviewState } from '../local-review-state';

// View-preference synchronization needs Angular DI; this check owns async dashboard reads.
vi.mock('@angular/core', async (original) => ({
  ...(await original<typeof import('@angular/core')>()),
  effect: vi.fn(),
}));

it('waits for an obsolete read and refreshes the dashboard before selecting an added repository', async () => {
  vi.useFakeTimers();
  const repository = {
    id: '163945cf-c0d1-4b52-9fb3-927552adfd57',
    label: 'repository',
    organization: null,
  };
  const empty: ReviewDashboard = {
    repositories: [],
    reviews: [],
    skills: [],
    reviewer: { available: true, version: 'codex-cli 0.167.0', error: null },
  };
  let release: ((dashboard: ReviewDashboard) => void) | undefined;
  const pending = new Promise<ReviewDashboard>((resolve) => {
    release = resolve;
  });
  const getReviews = vi
    .fn<() => Promise<ReviewDashboard>>()
    .mockReturnValueOnce(pending)
    .mockResolvedValue({ ...empty, repositories: [repository] });
  vi.stubGlobal('window', {
    selvedge: { getReviews, chooseRepository: vi.fn(() => Promise.resolve(repository)) },
  });
  let cleanup: (() => void) | undefined;
  const destroy: DestroyRef = {
    destroyed: false,
    onDestroy(callback) {
      cleanup = callback;
      return () => {};
    },
  };
  try {
    const state = new LocalReviewState(destroy);
    const adding = state.chooseRepository();
    await Promise.resolve();
    release?.(empty);
    await adding;
    expect(state.repository()).toEqual(repository);
  } finally {
    cleanup?.();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
