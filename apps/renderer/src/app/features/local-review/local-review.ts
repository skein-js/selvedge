import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { disabled, form, required } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';

import { RuntimeCheck } from '../runtime-check/runtime-check';
import { BranchPicker } from './branch-picker';
import { LocalReviewState } from './local-review-state';
import { RepositorySidebar } from './repository-sidebar';
import { ReviewResult } from './review-result';
import { ReviewSkillPicker } from './review-skill-picker';

@Component({
  selector: 'app-local-review',
  imports: [
    ButtonModule,
    BranchPicker,
    ReviewResult,
    RepositorySidebar,
    RuntimeCheck,
    ReviewSkillPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside>
      <app-repository-sidebar [state]="state" />
    </aside>
    <main>
      <header class="toolbar">
        <div>
          <strong>{{ state.repository()?.label || 'Local reviews' }}</strong>
          <span>{{ state.repository()?.organization || 'Local repository' }}</span>
        </div>
        <span class="provider">{{
          state.dashboard()?.reviewer?.version || 'Checking Codex…'
        }}</span>
      </header>
      <div class="content">
        @if (state.activeReview(); as review) {
          <div class="activity" role="status">
            <span>{{ review.repository.label }} · {{ review.status }}</span>
            <p-button
              size="small"
              label="Cancel review"
              severity="secondary"
              [disabled]="state.submitting() || review.status === 'cancelling'"
              (onClick)="state.cancel(review.id)"
            />
          </div>
        }
        @if (state.error() || state.connectionError(); as problem) {
          <p class="warning" role="alert">{{ problem }}</p>
        }
        @if (state.composing() && state.repository()) {
          <section aria-labelledby="review-heading" class="new-review">
            <h1 id="review-heading">New review</h1>
            @if (state.dashboard()?.reviewer?.error; as problem) {
              <p class="warning">{{ problem }}</p>
            }
            <form (submit)="run($event)">
              <app-branch-picker
                [repositoryId]="state.input().repositoryId"
                [baseField]="fields.baseRef"
                [headField]="fields.headRef"
                [busy]="state.busy()"
                (selection)="selectBranches($event)"
                (loadingChanged)="branchesLoading.set($event)"
              />
              <app-review-skill-picker
                [field]="fields.skillId"
                [skills]="state.dashboard()?.skills || []"
                [busy]="state.busy() || branchesLoading()"
                (importRequested)="state.importSkill()"
              />
              <p class="consent">
                Committed source and the selected skill are sent to OpenAI using your Codex CLI
                login and quota or billing. No repository scripts, source edits, or GitHub
                publication.
              </p>
              @if (state.dashboard()?.reviews?.length === 50) {
                <p class="warning" role="alert">
                  This preview has retained 50 attempts. Restart with a separate SELVEDGE_USER_DATA
                  directory to continue.
                </p>
              }
              <div class="actions">
                <p-button
                  size="small"
                  type="submit"
                  label="Run private review"
                  [loading]="state.submitting()"
                  [disabled]="
                    !state.dashboard()?.reviewer?.available ||
                    state.busy() ||
                    fields().invalid() ||
                    branchesLoading() ||
                    state.input().baseRef === state.input().headRef ||
                    state.dashboard()?.reviews?.length === 50
                  "
                />
              </div>
            </form>
          </section>
        }
        @if (state.selected(); as review) {
          <app-review-result [value]="review" />
        } @else if (!state.repository()) {
          <p class="empty">Add a local Git repository from the sidebar to begin.</p>
        }
        <details class="diagnostics">
          <summary>Local runtime diagnostics</summary>
          <app-runtime-check />
        </details>
      </div>
    </main>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 230px minmax(0, 1fr);
      min-height: 0;
    }
    aside {
      overflow: auto;
      border-right: 1px solid var(--selvedge-border);
      background: var(--selvedge-canvas);
    }
    main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 44px;
      padding: 8px 16px;
      border-bottom: 1px solid var(--selvedge-border);
    }
    .toolbar > div {
      display: flex;
      gap: 12px;
      min-width: 0;
      align-items: baseline;
    }
    .toolbar strong {
      overflow-wrap: anywhere;
    }
    .toolbar span,
    .actions > span {
      color: var(--selvedge-muted);
      font-size: 11px;
    }
    .content {
      padding: 16px;
      overflow: auto;
      flex: 1;
      min-height: 0;
    }
    h1 {
      font-size: 14px;
      margin: 0 0 14px;
      font-weight: 650;
    }
    .consent,
    .empty {
      color: var(--selvedge-muted);
      font-size: 11px;
      line-height: 1.6;
    }
    .consent {
      max-width: 760px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .warning {
      color: var(--selvedge-danger);
      font-size: 12px;
      line-height: 1.6;
    }
    .new-review {
      border-bottom: 1px solid var(--selvedge-border);
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .activity {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--selvedge-border);
      padding-bottom: 12px;
      margin-bottom: 16px;
      font-size: 11px;
    }
    .diagnostics {
      border-top: 1px solid var(--selvedge-border);
      padding-top: 12px;
      margin-top: 20px;
      font-size: 11px;
    }
    summary {
      cursor: pointer;
    }
    app-runtime-check {
      display: block;
      margin-top: 12px;
    }
    @media (max-width: 750px) {
      :host {
        grid-template-columns: 175px minmax(0, 1fr);
      }
      .toolbar > div {
        display: grid;
        gap: 2px;
      }
      .provider {
        display: none;
      }
      .content {
        padding: 12px;
      }
    }
    @media (max-width: 550px) {
      :host {
        grid-template-columns: 155px minmax(0, 1fr);
      }
    }
  `,
})
export class LocalReview {
  readonly state = new LocalReviewState(inject(DestroyRef));
  readonly branchesLoading = signal(true);
  readonly fields = form(this.state.input, (path) => {
    required(path.repositoryId);
    required(path.skillId);
    required(path.baseRef);
    required(path.headRef);
    disabled(path, { when: () => this.state.busy() || this.branchesLoading() });
  });
  selectBranches(selection: { baseRef: string; headRef: string }) {
    this.state.input.update((value) => ({ ...value, ...selection }));
  }
  async run(event: Event) {
    event.preventDefault();
    if (
      !this.fields().invalid() &&
      !this.branchesLoading() &&
      this.state.input().baseRef !== this.state.input().headRef
    )
      await this.state.start();
  }
}
