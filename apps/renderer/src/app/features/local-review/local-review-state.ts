import { computed, type DestroyRef, effect, signal } from '@angular/core';
import { defaultSkillId, isReviewActive, type ReviewDashboard } from '@selvedge/contracts';

import { loadSidebarView, saveSidebarView } from './sidebar-view';

export class LocalReviewState {
  private readonly initial = loadSidebarView();
  readonly dashboard = signal<ReviewDashboard | null>(null);
  readonly selectedId = signal(this.initial.reviewId);
  readonly composing = signal(this.initial.composing);
  readonly preferences = signal(this.initial.preferences);
  readonly collapsedGroups = signal(this.initial.collapsedGroups);
  readonly collapsedRepositories = signal(this.initial.collapsedRepositories);
  readonly error = signal('');
  readonly connectionError = signal('');
  readonly submitting = signal(false);
  readonly activeReview = computed(() => this.dashboard()?.reviews.find(isReviewActive));
  readonly busy = computed(
    () => this.submitting() || !!this.activeReview() || !!this.connectionError(),
  );
  readonly selected = computed(() =>
    this.composing()
      ? undefined
      : (this.history().find((review) => review.id === this.selectedId()) ?? this.history()[0]),
  );
  readonly input = signal({
    repositoryId: this.initial.repositoryId,
    baseRef: '',
    headRef: '',
    skillId: defaultSkillId,
  });
  readonly repository = computed(() =>
    this.dashboard()?.repositories.find(
      (repository) => repository.id === this.input().repositoryId,
    ),
  );
  readonly history = computed(
    () =>
      this.dashboard()?.reviews.filter(
        (review) => review.repository.id === this.input().repositoryId,
      ) ?? [],
  );
  private refreshTask: Promise<void> | null = null;
  private revision = 0;

  constructor(destroy: DestroyRef) {
    effect(() =>
      saveSidebarView({
        preferences: this.preferences(),
        repositoryId: this.input().repositoryId,
        reviewId: this.selectedId(),
        composing: this.composing(),
        collapsedGroups: this.collapsedGroups(),
        collapsedRepositories: this.collapsedRepositories(),
      }),
    );
    void this.refresh();
    const timer = setInterval(() => {
      if (!this.dashboard() || this.activeReview() || this.connectionError()) void this.refresh();
    }, 1500);
    destroy.onDestroy(() => {
      clearInterval(timer);
      this.revision++;
    });
  }

  private async refresh() {
    if (this.refreshTask) await this.refreshTask;
    if (this.submitting()) return;
    this.refreshTask ??= this.loadDashboard().finally(() => {
      this.refreshTask = null;
    });
    await this.refreshTask;
  }

  private async loadDashboard() {
    const revision = this.revision;
    try {
      const dashboard = await window.selvedge.getReviews();
      if (revision === this.revision) {
        this.dashboard.set(dashboard);
        if (
          !dashboard.repositories.some((repository) => repository.id === this.input().repositoryId)
        ) {
          const first = dashboard.repositories[0];
          if (first) this.selectRepository(first.id);
        }
        this.connectionError.set('');
      }
    } catch {
      if (revision === this.revision)
        this.connectionError.set(
          'The local review service is unavailable. Wait for recovery or restart Selvedge.',
        );
    }
  }

  async chooseRepository() {
    this.error.set('');
    this.submitting.set(true);
    this.revision++;
    try {
      const repository = await window.selvedge.chooseRepository();
      this.submitting.set(false);
      if (!repository) return;
      await this.refresh();
      this.newReview(repository.id);
    } catch {
      this.error.set(
        'Could not open this repository. Select a local Git repository after the runtime is ready.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  selectRepository(id: string) {
    this.input.update((value) => ({ ...value, repositoryId: id }));
    const first = this.history()[0];
    this.selectedId.set(first?.id ?? '');
    this.composing.set(!first);
  }

  newReview(repositoryId = this.input().repositoryId) {
    if (!repositoryId) return;
    this.input.update((value) => ({ ...value, repositoryId, baseRef: '', headRef: '' }));
    this.selectedId.set('');
    this.composing.set(true);
    this.error.set('');
  }

  openReview(id: string) {
    const review = this.dashboard()?.reviews.find((item) => item.id === id);
    if (!review) return;
    this.input.update((value) => ({ ...value, repositoryId: review.repository.id }));
    this.selectedId.set(id);
    this.composing.set(false);
    this.error.set('');
  }

  async organizeSidebar() {
    const preferences = await window.selvedge.showSidebarOptions(this.preferences());
    if (preferences) this.preferences.set(preferences);
  }

  async importSkill() {
    this.submitting.set(true);
    this.revision++;
    this.error.set('');
    try {
      const skill = await window.selvedge.importReviewSkill();
      this.submitting.set(false);
      await this.refresh();
      if (skill) this.input.update((value) => ({ ...value, skillId: skill.id }));
    } catch {
      this.error.set(
        'Choose a UTF-8 SKILL.md file up to 16 KiB. This preview retains up to 16 skills.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  async start() {
    if (this.busy() || !this.dashboard()?.reviewer.available) return;
    this.revision++;
    this.submitting.set(true);
    this.error.set('');
    try {
      const review = await window.selvedge.startReview({
        ...this.input(),
        requestId: crypto.randomUUID(),
      });
      this.selectedId.set(review.id);
      this.composing.set(false);
      this.dashboard.update((value) =>
        value
          ? {
              ...value,
              reviews: [review, ...value.reviews.filter((item) => item.id !== review.id)],
            }
          : value,
      );
    } catch {
      this.error.set(
        'The review was not admitted. Check Codex availability and the active review, then try again.',
      );
    } finally {
      this.submitting.set(false);
      void this.refresh();
    }
  }

  async cancel(id: string) {
    this.revision++;
    this.submitting.set(true);
    try {
      await window.selvedge.cancelReview(id);
    } catch {
      this.error.set(
        'Cancellation could not be confirmed. Keep Selvedge open until the runtime recovers.',
      );
    } finally {
      this.submitting.set(false);
      await this.refresh();
    }
  }
}
