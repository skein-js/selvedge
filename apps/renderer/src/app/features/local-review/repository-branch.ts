import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Repository } from '@selvedge/contracts';

import type { LocalReviewState } from './local-review-state';
import { reviewRefLabel } from './review-labels';

export function repositoryName(repository: Repository) {
  return (repository.organization ? repository.organization + '/' : '') + repository.label;
}

@Component({
  selector: 'app-repository-branch',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="repository-row" [class.current]="repository().id === state().input().repositoryId">
      <button
        type="button"
        class="disclosure"
        [attr.aria-label]="'Toggle reviews in ' + name()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="'reviews-' + repository().id"
        (click)="toggle()"
      >
        <span class="chevron" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        class="repository"
        data-testid="repository-item"
        [attr.aria-label]="name()"
        [attr.aria-current]="
          repository().id === state().input().repositoryId && state().composing() ? 'page' : null
        "
        (click)="state().selectRepository(repository().id)"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M2 5h6l2 2h8v10H2z" /></svg>
        <span>{{ repository().label }}</span>
      </button>
    </div>
    <ul class="reviews" [id]="'reviews-' + repository().id" [hidden]="!open()">
      @for (review of reviews(); track review.id) {
        <li>
          <button
            type="button"
            class="review"
            [attr.data-review-id]="review.id"
            [attr.aria-current]="state().selected()?.id === review.id ? 'page' : null"
            [title]="refLabel(review.baseRef) + ' → ' + refLabel(review.headRef)"
            (click)="state().openReview(review.id)"
          >
            <span class="review-title"
              >{{ refLabel(review.baseRef) }} → {{ refLabel(review.headRef) }}</span
            >
            <span class="review-meta"
              >{{ review.status }} · {{ review.createdAt | date: 'MMM d, HH:mm' }}</span
            >
          </button>
        </li>
      } @empty {
        <li class="empty">No reviews yet</li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    button {
      color: var(--selvedge-ink);
      background: transparent;
      border: 0;
      border-radius: 4px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }
    button:hover,
    .repository-row.current {
      background: var(--selvedge-divider);
    }
    .repository-row {
      display: flex;
      align-items: center;
      border-radius: 4px;
    }
    .disclosure {
      width: 20px;
      align-self: stretch;
      flex: 0 0 20px;
    }
    .chevron {
      display: inline-block;
      border-left: 4px solid currentColor;
      border-top: 3px solid transparent;
      border-bottom: 3px solid transparent;
    }
    button[aria-expanded='true'] .chevron {
      transform: rotate(90deg);
    }
    .repository {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
      padding: 7px 4px;
      text-align: left;
      font-weight: 600;
    }
    svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linejoin: round;
    }
    .repository > span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .reviews {
      list-style: none;
      margin: 0 0 6px 27px;
      border-left: 1px solid var(--selvedge-border);
      padding: 0 0 0 6px;
    }
    .review {
      display: grid;
      gap: 3px;
      width: 100%;
      padding: 7px 6px;
      text-align: left;
      min-width: 0;
    }
    .review[aria-current] {
      background: var(--selvedge-panel);
      box-shadow: inset 0 0 0 1px var(--selvedge-border);
    }
    .review-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 11px;
    }
    .review-meta,
    .empty {
      color: var(--selvedge-muted);
      font-size: 10px;
      line-height: 1.6;
    }
    .empty {
      padding: 6px;
    }
  `,
})
export class RepositoryBranch {
  readonly refLabel = reviewRefLabel;
  readonly state = input.required<LocalReviewState>();
  readonly repository = input.required<Repository>();
  readonly name = computed(() => repositoryName(this.repository()));
  readonly reviews = computed(
    () =>
      this.state()
        .dashboard()
        ?.reviews.filter((review) => review.repository.id === this.repository().id) ?? [],
  );
  readonly open = computed(
    () => !this.state().collapsedRepositories().includes(this.repository().id),
  );
  toggle() {
    const id = this.repository().id;
    this.state().collapsedRepositories.update((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }
}
