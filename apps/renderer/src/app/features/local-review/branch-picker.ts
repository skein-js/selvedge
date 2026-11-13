import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { type FieldTree, FormField } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import type { RepositoryBranches } from '@selvedge/contracts';

@Component({
  selector: 'app-branch-picker',
  imports: [FormField, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="branches">
      <div>
        <label for="base-branch">Base branch</label>
        <select id="base-branch" [formField]="baseField()">
          <option value="">Choose base branch</option>
          @for (branch of data()?.branches || []; track branch.ref) {
            <option [value]="branch.ref">{{ branch.label }}</option>
          }
        </select>
      </div>
      <div>
        <label for="review-branch">Review branch</label>
        <select id="review-branch" [formField]="headField()">
          <option value="">Choose branch to review</option>
          @for (branch of data()?.branches || []; track branch.ref) {
            <option [value]="branch.ref">{{ branch.label }}</option>
          }
        </select>
      </div>
    </div>
    <div class="details">
      <span>{{
        loading()
          ? 'Loading branches…'
          : 'Local and already-fetched branches. No checkout or fetch.'
      }}</span>
      <p-button
        size="small"
        label="Refresh branches"
        severity="secondary"
        [text]="true"
        [disabled]="busy() || loading()"
        (onClick)="refresh()"
      />
    </div>
    @if (error()) {
      <p class="warning" role="alert">{{ error() }}</p>
    } @else if (!loading() && data()?.branches?.length === 0) {
      <p class="warning">
        No branches with commits found. Create or fetch a branch in your Git client, then refresh.
      </p>
    } @else if (baseField()().value() && baseField()().value() === headField()().value()) {
      <p class="warning">Choose different base and review branches.</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .branches {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .branches > div {
      min-width: 0;
    }
    label {
      display: grid;
      gap: 5px;
      font-size: 11px;
      margin-bottom: 5px;
    }
    .details {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 5px;
      color: var(--selvedge-muted);
      font-size: 11px;
    }
    .warning {
      color: var(--selvedge-danger);
      font-size: 11px;
      line-height: 1.6;
    }
    @media (max-width: 550px) {
      .branches {
        grid-template-columns: 1fr;
      }
      .details {
        align-items: start;
        flex-direction: column;
      }
    }
  `,
})
export class BranchPicker {
  readonly repositoryId = input.required<string>();
  readonly baseField = input.required<FieldTree<string>>();
  readonly headField = input.required<FieldTree<string>>();
  readonly busy = input(false);
  readonly selection = output<{ baseRef: string; headRef: string }>();
  readonly loadingChanged = output<boolean>();
  readonly data = signal<RepositoryBranches | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  private revision = 0;
  private loadedRepository = '';

  constructor() {
    effect(() => {
      void this.refresh(this.repositoryId());
    });
    inject(DestroyRef).onDestroy(() => this.revision++);
  }

  async refresh(repositoryId = this.repositoryId()) {
    const revision = ++this.revision;
    this.loading.set(true);
    this.loadingChanged.emit(true);
    this.error.set('');
    try {
      const data = await window.selvedge.getRepositoryBranches(repositoryId);
      if (revision !== this.revision) return;
      const valid = (ref: string) => data.branches.some((branch) => branch.ref === ref);
      const previousBase = this.baseField()().value();
      const previousHead = this.headField()().value();
      const keep = this.loadedRepository === repositoryId;
      this.data.set(data);
      this.loadedRepository = repositoryId;
      this.selection.emit({
        baseRef: keep && valid(previousBase) ? previousBase : (data.defaultBaseRef ?? ''),
        headRef: keep && valid(previousHead) ? previousHead : (data.currentRef ?? ''),
      });
    } catch {
      if (revision !== this.revision) return;
      this.data.set(null);
      this.selection.emit({ baseRef: '', headRef: '' });
      this.error.set('Could not load branches. Check this local Git repository, then refresh.');
    } finally {
      if (revision === this.revision) {
        this.loading.set(false);
        this.loadingChanged.emit(false);
      }
    }
  }
}
