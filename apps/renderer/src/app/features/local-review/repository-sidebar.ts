import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import type { Repository } from '@selvedge/contracts';

import type { LocalReviewState } from './local-review-state';
import { RepositoryBranch, repositoryName } from './repository-branch';

@Component({
  selector: 'app-repository-sidebar',
  imports: [FormField, RepositoryBranch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'shortcut($event)' },
  template: `
    <nav aria-label="Repository browser">
      <button
        type="button"
        class="new-review"
        [disabled]="!state().repository()"
        (click)="state().newReview()"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M13 3l4 4M4 16l4-1L17 6a2 2 0 0 0-3-3L5 12z" />
        </svg>
        <span>New review</span>
      </button>
      <input
        type="search"
        aria-label="Find repository"
        placeholder="Find repository…"
        [formField]="fields.query"
      />
      <div class="section-heading" (contextmenu)="organize($event)">
        <h2>Repositories</h2>
        <div class="tools">
          <button
            type="button"
            class="icon-button"
            aria-label="Group and sort repositories"
            aria-haspopup="menu"
            title="Group and sort"
            (click)="organize()"
          >
            ⋯
          </button>
          <button
            type="button"
            class="icon-button"
            aria-label="Add repository"
            title="Add repository"
            [disabled]="state().busy()"
            (click)="state().chooseRepository()"
          >
            +
          </button>
        </div>
      </div>
      @for (group of groups(); track group.name) {
        <section>
          @if (state().preferences().group === 'organization') {
            <button
              class="group-heading"
              type="button"
              [attr.aria-expanded]="group.open"
              [attr.aria-controls]="group.key"
              (click)="toggleGroup(group.name)"
            >
              <span class="chevron" aria-hidden="true"></span>{{ group.name }}
            </button>
          }
          <ul [id]="group.key" [hidden]="!group.open">
            @for (repository of group.repositories; track repository.id) {
              <li><app-repository-branch [state]="state()" [repository]="repository" /></li>
            }
          </ul>
        </section>
      } @empty {
        <p class="empty">
          {{
            state().dashboard()?.repositories?.length
              ? 'No matching repositories.'
              : 'Add a local repository to begin.'
          }}
        </p>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    nav {
      padding: 10px 8px;
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
    button:disabled {
      cursor: default;
      opacity: 0.5;
    }
    button:hover:not(:disabled) {
      background: var(--selvedge-divider);
    }
    .new-review {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      text-align: left;
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
    input {
      font-size: 11px;
    }
    .section-heading,
    .tools {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-heading {
      margin: 14px 0 4px;
      padding-left: 6px;
    }
    h2 {
      font-size: 11px;
      margin: 0;
      font-weight: 600;
      color: var(--selvedge-muted);
    }
    .icon-button {
      width: 25px;
      height: 25px;
      font-size: 18px;
    }
    .group-heading {
      display: flex;
      align-items: center;
      gap: 7px;
      width: 100%;
      padding: 9px 6px 5px;
      font-size: 11px;
      text-align: left;
      overflow-wrap: anywhere;
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
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .empty {
      color: var(--selvedge-muted);
      font-size: 10px;
      line-height: 1.6;
      padding: 6px;
    }
  `,
})
export class RepositorySidebar {
  readonly state = input.required<LocalReviewState>();
  readonly search = signal({ query: '' });
  readonly fields = form(this.search);
  readonly groups = computed(() => {
    const state = this.state();
    const { group, sort } = state.preferences();
    const query = this.search().query.trim().toLocaleLowerCase();
    const reviews = state.dashboard()?.reviews ?? [];
    const latest = new Map<string, string>();
    for (const review of reviews) {
      const at = review.completedAt ?? review.createdAt;
      if (at > (latest.get(review.repository.id) ?? '')) latest.set(review.repository.id, at);
    }
    const repositories = (state.dashboard()?.repositories ?? [])
      .filter((repository) => repositoryName(repository).toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === 'recent') {
          const recent = (latest.get(b.id) ?? '').localeCompare(latest.get(a.id) ?? '');
          if (recent) return recent;
        }
        return a.label.localeCompare(b.label) * (sort === 'reverse' ? -1 : 1);
      });
    const grouped = new Map<string, Repository[]>();
    for (const repository of repositories) {
      const name =
        group === 'organization'
          ? (repository.organization ?? 'Local repositories')
          : 'Repositories';
      const entries = grouped.get(name) ?? [];
      entries.push(repository);
      grouped.set(name, entries);
    }
    const groups = [...grouped].map(([name, repositories]) => ({
      name,
      key: 'group-' + encodeURIComponent(name),
      repositories,
      open: group === 'repository' || !state.collapsedGroups().includes(name),
    }));
    return sort === 'recent'
      ? groups
      : groups.sort((a, b) => a.name.localeCompare(b.name) * (sort === 'reverse' ? -1 : 1));
  });
  toggleGroup(name: string) {
    this.state().collapsedGroups.update((items) =>
      items.includes(name) ? items.filter((item) => item !== name) : [...items, name],
    );
  }
  async organize(event?: Event) {
    event?.preventDefault();
    await this.state().organizeSidebar();
  }
  shortcut(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.state().newReview();
    }
    if (event.key.toLowerCase() === 'o' && !this.state().busy()) {
      event.preventDefault();
      void this.state().chooseRepository();
    }
  }
}
