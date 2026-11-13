import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { isReviewActive, type Review } from '@selvedge/contracts';

import { reviewRefLabel } from './review-labels';

@Component({
  selector: 'app-review-result',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let review = value();
    <section
      class="review-panel result"
      aria-labelledby="result-heading"
      [attr.aria-busy]="isActive(review)"
    >
      <div class="heading">
        <h2 id="result-heading">{{ review.repository.label }}</h2>
        <strong data-testid="review-status" role="status">{{ review.status }}</strong>
      </div>
      <p class="description">
        {{ refLabel(review.baseRef) }} → {{ refLabel(review.headRef) }} ·
        {{ review.createdAt | date: 'medium' }}
      </p>
      @if (review.skill; as skill) {
        <p class="description">
          Skill: {{ skill.name }} <code>{{ skill.digest.slice(0, 12) }}</code>
        </p>
      }
      @if (review.target; as target) {
        <details>
          <summary>Exact reviewed revisions</summary>
          <dl>
            <dt>Base</dt>
            <dd>
              <code>{{ target.baseSha }}</code>
            </dd>
            <dt>Head</dt>
            <dd>
              <code>{{ target.headSha }}</code>
            </dd>
            <dt>Merge base</dt>
            <dd>
              <code>{{ target.mergeBaseSha }}</code>
            </dd>
          </dl>
        </details>
      }
      @if (review.status === 'preparing') {
        <p role="status">Preparing immutable source context…</p>
      }
      @if (review.status === 'running') {
        <p role="status">
          Codex is reviewing. You can close the dashboard; Quit cancels active work.
        </p>
      }
      @if (review.status === 'cancelling') {
        <p role="status">Stopping Codex. Cancellation will be confirmed after it exits.</p>
      }
      @if (review.error) {
        <p class="warning" role="alert">{{ review.error }}</p>
      }
      @if (review.result; as result) {
        <p data-testid="review-summary">{{ result.summary }}</p>
        @for (finding of result.findings; track $index) {
          <article class="finding">
            <span class="severity">{{ finding.severity }}</span><code
              >{{ finding.file }} · {{ finding.side }}:{{ finding.startLine }}–{{
                finding.endLine
              }}</code
            >
            <p>{{ finding.explanation }}</p>
            <p class="suggestion">Suggestion: {{ finding.suggestion }}</p>
          </article>
        } @empty {
          <p>No findings reported in the supplied context. This is not proof of correctness.</p>
        }
      }
      @if (review.exclusions.length) {
        <details open>
          <summary class="warning">
            Partial coverage: {{ review.exclusions.length }} exclusions
          </summary>
          <ul>
            @for (exclusion of review.exclusions; track $index) {
              <li>
                <code>{{ exclusion.path }}</code> — {{ exclusion.reason }}
              </li>
            }
          </ul>
        </details>
      }
    </section>
  `,
  styles: `
    .review-panel {
      overflow-wrap: anywhere;
      background: var(--selvedge-panel);
      border: 1px solid var(--selvedge-border);
      border-radius: 3px;
      padding: 14px;
      margin-bottom: 16px;
      font-size: 12px;
      line-height: 1.7;
    }
    .heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    h2 {
      margin: 0;
      font-size: 14px;
    }
    .description,
    dt,
    .suggestion {
      color: var(--selvedge-muted);
    }
    code {
      overflow-wrap: anywhere;
      font-size: 11px;
    }
    dd {
      margin: 0 0 8px;
    }
    .finding {
      border-top: 1px solid var(--selvedge-divider);
      padding: 16px 0;
    }
    .severity {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--selvedge-divider);
      margin-right: 8px;
    }
    .warning {
      color: var(--selvedge-danger);
    }
    summary {
      cursor: pointer;
    }
  `,
})
export class ReviewResult {
  readonly isActive = isReviewActive;
  readonly refLabel = reviewRefLabel;
  readonly value = input.required<Review>();
}
